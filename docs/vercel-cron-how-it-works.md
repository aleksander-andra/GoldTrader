# Jak działa Vercel Cron Jobs - Techniczne wyjaśnienie

## 1. Przegląd całego procesu

```
┌─────────────────┐
│  Vercel Cron    │  ← Harmonogram (np. co godzinę)
│     Scheduler   │
└────────┬────────┘
         │
         │ (1) Wykrywa czas wykonania
         │
         ▼
┌─────────────────┐
│  Vercel Server  │  ← Dodaje nagłówki (X-CRON-SECRET)
│   (Internal)    │
└────────┬────────┘
         │
         │ (2) Wywołuje endpoint z nagłówkami
         │
         ▼
┌─────────────────────────────────┐
│  /api/admin/cron/generate-      │
│  signals (Astro endpoint)       │
└────────┬────────────────────────┘
         │
         │ (3) Weryfikuje X-CRON-SECRET
         │
         ▼
┌─────────────────┐
│  Autoryzacja    │  ← Sprawdza czy secret się zgadza
│   (Security)    │
└────────┬────────┘
         │
         │ (4) Tworzy Supabase client z SERVICE_ROLE_KEY
         │
         ▼
┌─────────────────┐
│  Supabase DB    │  ← Bypassuje RLS (service role)
│   (Database)    │
└────────┬────────┘
         │
         │ (5) Generuje sygnały / synchronizuje ceny
         │
         ▼
┌─────────────────┐
│  Response       │  ← Zwraca wynik (JSON)
│   (Success)     │
└─────────────────┘
```

## 2. Krok po kroku - szczegółowy flow

### Krok 1: Harmonogram (Vercel Cron Scheduler)

**Plik:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/admin/cron/generate-signals",
      "schedule": "0 * * * *" // Co godzinę o pełnej godzinie
    }
  ]
}
```

**Co się dzieje:**

- Vercel ma wewnętrzny scheduler, który czyta `vercel.json`
- Scheduler sprawdza harmonogram (format cron: `minuta godzina dzień miesiąc dzień-tygodnia`)
- Gdy nadejdzie czas wykonania, scheduler uruchamia proces

**Przykłady harmonogramów:**

- `0 * * * *` - co godzinę (00:00, 01:00, 02:00, ...)
- `0 6 * * *` - codziennie o 06:00 UTC
- `*/15 * * * *` - co 15 minut
- `0 0 * * *` - codziennie o północy UTC

### Krok 2: Wywołanie endpointu (Vercel Server)

**Co się dzieje:**

1. Vercel Server (wewnętrzny) przygotowuje HTTP request
2. Dodaje nagłówki skonfigurowane w Vercel Dashboard:
   - `X-CRON-SECRET: <wartość z ENV CRON_SECRET>`
   - `Content-Type: application/json`
3. Wysyła POST request do endpointu:
   ```
   POST https://twoj-projekt.vercel.app/api/admin/cron/generate-signals
   Headers:
     X-CRON-SECRET: abc123xyz...
     Content-Type: application/json
   Body: {} (opcjonalnie)
   ```

**Ważne:**

- To jest **wewnętrzne** wywołanie Vercel → Vercel (nie z zewnątrz)
- Vercel automatycznie dodaje nagłówki, które skonfigurowałeś w Dashboard
- Możesz też użyć `{{CRON_SECRET}}` w Dashboard, a Vercel podstawi wartość z ENV

### Krok 3: Weryfikacja autoryzacji (Endpoint)

**Kod:** `src/pages/api/admin/cron/generate-signals.ts`

```typescript
export async function POST(context: APIContext) {
  // 1. Pobierz secret z nagłówka
  const cronSecret = context.request.headers.get("x-cron-secret");

  // 2. Pobierz oczekiwany secret z ENV
  const expectedSecret = import.meta.env.CRON_SECRET;

  // 3. Porównaj
  if (!cronSecret || cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Invalid or missing X-CRON-SECRET" }), {
      status: 401,
    });
  }

  // 4. Jeśli się zgadza - kontynuuj
  // ...
}
```

**Co się dzieje:**

1. Endpoint odbiera request
2. Sprawdza czy header `X-CRON-SECRET` istnieje
3. Porównuje wartość z nagłówka z wartością z `CRON_SECRET` (ENV variable)
4. Jeśli się **nie zgadza** → zwraca 401 Unauthorized
5. Jeśli się **zgadza** → kontynuuje wykonanie

**Dlaczego to ważne:**

- Chroni endpoint przed nieautoryzowanym dostępem
- Tylko Vercel Cron (z poprawnym secretem) może wywołać endpoint
- Ktoś z zewnątrz nie może wywołać endpointu bez znajomości secretu

### Krok 4: Tworzenie Supabase Client (Service Role)

**Kod:**

```typescript
// Użyj service role key zamiast tokena użytkownika
const url = import.meta.env.SUPABASE_URL;
const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// Utwórz klienta z service role key
const supabase = createClient<Database>(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

**Co się dzieje:**

1. Endpoint pobiera `SUPABASE_SERVICE_ROLE_KEY` z ENV
2. Tworzy Supabase client z **service role key** (nie anon key)
3. Service role key **bypassuje RLS** (Row Level Security)

**Dlaczego service role key:**

- Normalne endpointy używają tokena użytkownika (Bearer token)
- Token użytkownika podlega RLS - może tylko czytać/modyfikować swoje dane
- Service role key **ignoruje RLS** - może wszystko (jak admin w bazie)
- Cron job potrzebuje pełnych uprawnień, bo działa "w imieniu systemu"

**Bezpieczeństwo:**

- Service role key jest **tylko** w ENV (nigdy w kodzie frontendowym)
- Tylko backend ma dostęp do tego klucza
- Endpoint jest dodatkowo chroniony przez `X-CRON-SECRET`

### Krok 5: Wykonanie akcji (Generowanie sygnałów / Synchronizacja)

**Dla generate-signals:**

```typescript
const result = await generateSignalsForAsset(supabase, {
  assetId: asset.id,
  assetSymbol: "XAUUSD",
  maxSignals: 1,
  validForMinutes: 60,
  lookbackMinutes: 240,
  // ...
});
```

**Co się dzieje:**

1. Endpoint wywołuje funkcję `generateSignalsForAsset()`
2. Funkcja:
   - Pobiera dane z bazy (price_history, news, itp.)
   - Oblicza sygnały na podstawie algorytmu
   - Zapisuje sygnały do tabeli `signals` (status: "candidate")
3. Zwraca wynik: liczba wygenerowanych sygnałów

**Dla sync-price-history:**

```typescript
const result = await syncDailyPriceHistoryForAsset("XAUUSD");
```

**Co się dzieje:**

1. Endpoint wywołuje funkcję `syncDailyPriceHistoryForAsset()`
2. Funkcja:
   - Pobiera dane z Alpha Vantage API
   - Zapisuje/aktualizuje rekordy w tabeli `price_history`
3. Zwraca wynik: liczba zsynchronizowanych rekordów

### Krok 6: Zwrócenie odpowiedzi

**Kod:**

```typescript
return new Response(
  JSON.stringify({
    ok: true,
    generated: result.inserted.length,
    symbol: "XAUUSD",
    // ...
  }),
  {
    status: 201,
    headers: { "Content-Type": "application/json" },
  }
);
```

**Co się dzieje:**

1. Endpoint zwraca JSON z wynikiem
2. Vercel loguje odpowiedź
3. Możesz zobaczyć logi w Vercel Dashboard → Deployments → Functions

## 3. Różnice między endpointami

### Normalny endpoint (dla użytkowników):

```
POST /api/admin/generate-signals
Headers:
  Authorization: Bearer <user_jwt_token>

Flow:
1. Weryfikuje JWT token użytkownika
2. Sprawdza czy użytkownik ma rolę "admin"
3. Używa tokena użytkownika (z RLS)
4. Ma limity dobowe (enforceDailyLimit)
```

### Cron endpoint (dla automatyzacji):

```
POST /api/admin/cron/generate-signals
Headers:
  X-CRON-SECRET: <secret_z_ENV>

Flow:
1. Weryfikuje X-CRON-SECRET
2. Nie sprawdza roli użytkownika (nie ma użytkownika!)
3. Używa SERVICE_ROLE_KEY (bez RLS)
4. Nie ma limitów dobowych (przeznaczone do automatyzacji)
```

## 4. Bezpieczeństwo - warstwy ochrony

### Warstwa 1: X-CRON-SECRET

- Tylko Vercel Cron zna secret
- Secret jest w ENV (nie w kodzie)
- Endpoint odrzuca requesty bez poprawnego secretu

### Warstwa 2: Service Role Key

- Tylko backend ma dostęp do klucza
- Klucz jest w ENV (nie w kodzie)
- Frontend nigdy nie widzi tego klucza

### Warstwa 3: Vercel Internal Network

- Cron jobs są wywoływane wewnętrznie (Vercel → Vercel)
- Nie są dostępne publicznie (tylko przez Vercel Cron)
- Możesz dodatkowo ograniczyć dostęp przez Vercel Dashboard

## 5. Monitoring i debugowanie

### Gdzie sprawdzić logi:

1. **Vercel Dashboard → Deployments:**
   - Wybierz deployment
   - Kliknij "Functions"
   - Zobacz logi dla `/api/admin/cron/generate-signals`

2. **Vercel Dashboard → Settings → Cron Jobs:**
   - Kliknij na cron job
   - Zobacz historię wykonania
   - Status: ✅ Success / ❌ Failed
   - Czas wykonania
   - Logi błędów

3. **Supabase Dashboard:**
   - Sprawdź czy sygnały są generowane (tabela `signals`)
   - Sprawdź czy ceny są synchronizowane (tabela `price_history`)

### Typowe problemy:

**401 Unauthorized:**

- ❌ Brak lub nieprawidłowy `X-CRON-SECRET`
- ✅ Sprawdź ENV variable `CRON_SECRET`
- ✅ Sprawdź header w konfiguracji cron job

**500 Server Error:**

- ❌ Brak lub nieprawidłowy `SUPABASE_SERVICE_ROLE_KEY`
- ✅ Sprawdź ENV variable
- ✅ Sprawdź logi w Vercel Dashboard

**Cron job nie wykonuje się:**

- ❌ Nieprawidłowy harmonogram
- ❌ Cron job nieaktywny
- ✅ Sprawdź harmonogram w `vercel.json`
- ✅ Sprawdź status w Vercel Dashboard

## 6. Podsumowanie

**Jak to działa w skrócie:**

1. **Vercel Cron Scheduler** sprawdza harmonogram (np. co godzinę)
2. Gdy nadejdzie czas, **Vercel Server** wywołuje endpoint z nagłówkiem `X-CRON-SECRET`
3. **Endpoint** weryfikuje secret i tworzy Supabase client z service role key
4. **Supabase client** wykonuje operacje (generowanie sygnałów / synchronizacja cen)
5. **Endpoint** zwraca wynik, który jest logowany w Vercel Dashboard

**Kluczowe elementy:**

- ✅ Harmonogram w `vercel.json`
- ✅ Secret w ENV (`CRON_SECRET`)
- ✅ Service role key w ENV (`SUPABASE_SERVICE_ROLE_KEY`)
- ✅ Nagłówki w konfiguracji cron job
- ✅ Endpointy w `src/pages/api/admin/cron/`

**Bezpieczeństwo:**

- 🔒 X-CRON-SECRET chroni przed nieautoryzowanym dostępem
- 🔒 Service role key jest tylko w ENV (nie w kodzie)
- 🔒 Endpointy są wywoływane wewnętrznie przez Vercel
