## Vercel Cron — automatyzacja generowania sygnałów i synchronizacji

Ten dokument opisuje zaimplementowaną integrację z Vercel Cron Jobs do automatycznego generowania sygnałów i synchronizacji historii cen.

### 1. Zaimplementowane endpointy

#### `/api/admin/cron/generate-signals`

- **Metoda**: `POST`
- **Autoryzacja**: Header `X-CRON-SECRET` (z ENV `CRON_SECRET`)
- **Funkcjonalność**: Generuje sygnały dla aktywów (domyślnie XAUUSD)
- **Używa**: `SUPABASE_SERVICE_ROLE_KEY` (bypassuje RLS)
- **Parametry** (opcjonalne w body):
  - `symbol` - symbol aktywa (domyślnie "XAUUSD")
  - `validFromOffsetMinutes` - offset w minutach od teraz (domyślnie 0)
  - `validToOffsetMinutes` - offset w minutach do końca ważności (domyślnie 60)
  - `lookbackMinutes` - okno historii w minutach (domyślnie 240)

#### `/api/admin/cron/sync-price-history`

- **Metoda**: `POST`
- **Autoryzacja**: Header `X-CRON-SECRET` (z ENV `CRON_SECRET`)
- **Funkcjonalność**: Synchronizuje historię cen z Alpha Vantage do bazy danych dla **jednego** aktywa
- **Używa**: `SUPABASE_SERVICE_ROLE_KEY` (bypassuje RLS)
- **Parametry** (opcjonalne w body):
  - `symbol` - symbol aktywa (domyślnie "XAUUSD")

#### `/api/admin/cron/sync-all-assets-price-history`

- **Metoda**: `POST`
- **Autoryzacja**: Header `X-CRON-SECRET` (z ENV `CRON_SECRET`)
- **Funkcjonalność**: Synchronizuje historię cen dla **WSZYSTKICH** aktywów z tabeli `assets`
- **Używa**: `SUPABASE_SERVICE_ROLE_KEY` (bypassuje RLS)
- **Parametry** (opcjonalne w body):
  - `symbols` - tablica symboli do synchronizacji (jeśli podane, synchronizuje tylko te; w przeciwnym razie wszystkie z bazy)
- **Zwraca**: Statystyki dla każdego aktywa (inserted, errors)

### 2. Konfiguracja Vercel Cron

Cron jobs są skonfigurowane w pliku `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/admin/cron/generate-signals",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/admin/cron/sync-price-history",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/admin/cron/sync-all-assets-price-history",
      "schedule": "0 7 * * *"
    }
  ]
}
```

**Harmonogram:**

- `generate-signals`: `0 * * * *` - co godzinę (o pełnej godzinie)
- `sync-price-history`: `0 6 * * *` - raz dziennie o 06:00 UTC (dla jednego aktywa - domyślnie XAUUSD)
- `sync-all-assets-price-history`: `0 7 * * *` - raz dziennie o 07:00 UTC (dla wszystkich aktywów z bazy)

**Dostosowanie harmonogramu:**
Możesz zmienić harmonogram w `vercel.json` lub skonfigurować go ręcznie w Vercel Dashboard:

- `Project` → `Settings` → `Cron Jobs`

**Format harmonogramu (cron):**

- `0 * * * *` - co godzinę
- `0 6 * * *` - codziennie o 06:00 UTC
- `*/15 * * * *` - co 15 minut
- `0 0 * * *` - codziennie o północy UTC

### 3. Konfiguracja zmiennych środowiskowych

W Vercel Dashboard (`Project` → `Settings` → `Environment Variables`) ustaw:

1. **`CRON_SECRET`** - losowy, bezpieczny string (np. wygeneruj przez `openssl rand -hex 32`)
   - Używany do autoryzacji wywołań cron
   - **WAŻNE**: Nie udostępniaj tego sekretu publicznie!

2. **`SUPABASE_SERVICE_ROLE_KEY`** - Service Role Key z Supabase
   - Znajdziesz w: Supabase Dashboard → Project Settings → API → `service_role` key
   - **WAŻNE**: Ten klucz bypassuje RLS - trzymaj go w tajemnicy!

3. Pozostałe zmienne (jak w `docs/env.cloud.example`):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `ALPHA_VANTAGE_API_KEY` (dla synchronizacji cen)
   - itd.

### 4. Bezpieczeństwo

**Autoryzacja:**

- Endpointy cron wymagają nagłówka `X-CRON-SECRET` z wartością równą `CRON_SECRET` z ENV
- Vercel automatycznie dodaje ten nagłówek przy wywołaniach cron (jeśli skonfigurowane w Dashboard)
- Alternatywnie możesz ustawić nagłówek ręcznie w konfiguracji cron w Vercel Dashboard

**Service Role Key:**

- Endpointy używają `SUPABASE_SERVICE_ROLE_KEY` zamiast tokena użytkownika
- To pozwala na bypass RLS i wykonywanie operacji administracyjnych
- **NIGDY** nie używaj service role key w kodzie frontendowym!

**Limity:**

- Endpointy cron **nie** używają `enforceDailyLimit` (są przeznaczone do automatyzacji)
- Jeśli potrzebujesz limitów, możesz je dodać wewnątrz endpointów cron

### 5. Testowanie lokalnie

Możesz przetestować endpointy cron lokalnie (przed deployem):

```bash
# Generuj sygnały
curl -X POST http://localhost:4321/api/admin/cron/generate-signals \
  -H "Content-Type: application/json" \
  -H "X-CRON-SECRET: your-secret-here" \
  -d '{"symbol": "XAUUSD"}'

# Synchronizuj historię cen
curl -X POST http://localhost:4321/api/admin/cron/sync-price-history \
  -H "Content-Type: application/json" \
  -H "X-CRON-SECRET: your-secret-here" \
  -d '{"symbol": "XAUUSD"}'
```

**Uwaga**: Upewnij się, że masz ustawione `CRON_SECRET` i `SUPABASE_SERVICE_ROLE_KEY` w `.env.local`.

### 6. Monitoring i logi

**Vercel Dashboard:**

- `Project` → `Deployments` → wybierz deployment → `Functions` → sprawdź logi funkcji
- `Project` → `Settings` → `Cron Jobs` → sprawdź historię wykonania cron jobs

**Logi endpointów:**

- Endpointy zwracają JSON z informacjami o wykonaniu:
  - `ok: true/false`
  - `generated` (dla generate-signals) - liczba wygenerowanych sygnałów
  - `inserted` (dla sync-price-history) - liczba zsynchronizowanych rekordów
  - `error` - w przypadku błędu

### 7. Dostosowanie harmonogramu

Jeśli chcesz zmienić częstotliwość wykonywania cron jobs:

1. **Przez `vercel.json`** (zalecane):

   ```json
   {
     "crons": [
       {
         "path": "/api/admin/cron/generate-signals",
         "schedule": "*/30 * * * *" // co 30 minut
       }
     ]
   }
   ```

2. **Przez Vercel Dashboard**:
   - `Project` → `Settings` → `Cron Jobs`
   - Edytuj istniejący cron lub dodaj nowy
   - Ustaw harmonogram i nagłówki

### 8. Status

✅ **Zaimplementowane:**

- Endpointy `/api/admin/cron/generate-signals` i `/api/admin/cron/sync-price-history`
- Autoryzacja przez `X-CRON-SECRET` header
- Użycie `SUPABASE_SERVICE_ROLE_KEY` dla bypassu RLS
- Konfiguracja w `vercel.json`
- Dokumentacja w `docs/env.cloud.example`

📝 **Do zrobienia (opcjonalnie):**

- Testy E2E dla endpointów cron (w środowisku preview)
- Monitoring i alerty dla błędów cron
- Dashboard metryk (liczba wygenerowanych sygnałów, częstotliwość błędów)
