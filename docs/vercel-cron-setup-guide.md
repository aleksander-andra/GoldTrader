# Vercel Cron Jobs - Instrukcja konfiguracji krok po kroku

## Krok 1: Przygotowanie zmiennych środowiskowych

### 1.1. Wygeneruj CRON_SECRET

Wygeneruj losowy, bezpieczny string dla `CRON_SECRET`:

**Windows (PowerShell):**

```powershell
# Użyj .NET do wygenerowania losowego stringa
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Windows (CMD) lub Linux/Mac:**

```bash
# Jeśli masz OpenSSL
openssl rand -hex 32

# Alternatywnie, możesz użyć online generatora (np. https://randomkeygen.com/)
```

**Zapisz wygenerowany string** - będziesz go potrzebować w następnych krokach.

### 1.2. Pobierz SUPABASE_SERVICE_ROLE_KEY

1. Zaloguj się do [Supabase Dashboard](https://app.supabase.com)
2. Wybierz swój projekt
3. Przejdź do: **Project Settings** (⚙️ ikona w lewym menu)
4. Kliknij **API** w lewym menu
5. Znajdź sekcję **Project API keys**
6. Skopiuj wartość **`service_role`** key (⚠️ **UWAGA**: To jest bardzo wrażliwy klucz - nie udostępniaj go publicznie!)
7. **Zapisz ten klucz** - będziesz go potrzebować w następnym kroku

## Krok 2: Konfiguracja w Vercel Dashboard

### 2.1. Ustaw zmienne środowiskowe

1. Zaloguj się do [Vercel Dashboard](https://vercel.com)
2. Wybierz swój projekt **GoldTrader**
3. Przejdź do: **Settings** (⚙️ ikona w górnym menu)
4. W lewym menu kliknij **Environment Variables**
5. Dodaj następujące zmienne:

   **a) CRON_SECRET:**
   - **Key**: `CRON_SECRET`
   - **Value**: wklej wygenerowany string z kroku 1.1
   - **Environment**: zaznacz **Production**, **Preview** i **Development** (lub tylko Production jeśli chcesz)
   - Kliknij **Save**

   **b) SUPABASE_SERVICE_ROLE_KEY:**
   - **Key**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: wklej service role key z kroku 1.2
   - **Environment**: zaznacz **Production**, **Preview** i **Development** (lub tylko Production)
   - Kliknij **Save**

   **c) Sprawdź czy masz już ustawione:**
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `ALPHA_VANTAGE_API_KEY` (dla synchronizacji cen)

### 2.2. Skonfiguruj Cron Jobs

1. W Vercel Dashboard, wciąż w **Settings**
2. W lewym menu kliknij **Cron Jobs**
3. Powinieneś zobaczyć listę cron jobs (jeśli `vercel.json` jest już w repo, mogą być już widoczne)

#### 2.2.1. Konfiguracja "Generate Signals" cron job

**Jeśli cron job już istnieje:**

1. Kliknij na istniejący cron job (lub ikonę edycji)
2. Sprawdź czy:
   - **Path**: `/api/admin/cron/generate-signals`
   - **Schedule**: `0 * * * *` (co godzinę)
   - **Method**: `POST`

**Jeśli cron job nie istnieje, dodaj nowy:**

1. Kliknij **Add Cron Job** (lub **Create**)
2. Wypełnij formularz:
   - **Path**: `/api/admin/cron/generate-signals`
   - **Schedule**: `0 * * * *` (co godzinę o pełnej godzinie)
   - **Method**: `POST`

**Dodaj nagłówek autoryzacji:**

1. W sekcji **Headers** (lub **Additional Headers**)
2. Kliknij **Add Header** (lub **+**)
3. Wypełnij:
   - **Name**: `X-CRON-SECRET`
   - **Value**: `{{CRON_SECRET}}` (Vercel automatycznie podstawi wartość z ENV)
   - Alternatywnie możesz wkleić bezpośrednio wartość (ale użycie `{{CRON_SECRET}}` jest bezpieczniejsze)
4. Kliknij **Save** (lub **Add**)

#### 2.2.2. Konfiguracja "Sync Price History" cron job

**Jeśli cron job już istnieje:**

1. Kliknij na istniejący cron job (lub ikonę edycji)
2. Sprawdź czy:
   - **Path**: `/api/admin/cron/sync-price-history`
   - **Schedule**: `0 6 * * *` (codziennie o 06:00 UTC)
   - **Method**: `POST`

**Jeśli cron job nie istnieje, dodaj nowy:**

1. Kliknij **Add Cron Job** (lub **Create**)
2. Wypełnij formularz:
   - **Path**: `/api/admin/cron/sync-price-history`
   - **Schedule**: `0 6 * * *` (codziennie o 06:00 UTC)
   - **Method**: `POST`

**Dodaj nagłówek autoryzacji:**

1. W sekcji **Headers** (lub **Additional Headers**)
2. Kliknij **Add Header** (lub **+**)
3. Wypełnij:
   - **Name**: `X-CRON-SECRET`
   - **Value**: `{{CRON_SECRET}}` (lub bezpośrednio wartość)
4. Kliknij **Save** (lub **Add**)

### 2.3. Weryfikacja konfiguracji

Po skonfigurowaniu powinieneś zobaczyć:

1. **Lista cron jobs:**
   - ✅ `/api/admin/cron/generate-signals` - `0 * * * *` (POST)
   - ✅ `/api/admin/cron/sync-price-history` - `0 6 * * *` (POST)

2. **Każdy cron job ma:**
   - Header `X-CRON-SECRET` z wartością z ENV

## Krok 3: Deploy i testowanie

### 3.1. Deploy zmian

1. Upewnij się, że plik `vercel.json` jest w repo (powinien być już po commitach)
2. Zrób commit i push na branch `main`:

   ```bash
   git add vercel.json src/pages/api/admin/cron/
   git commit -m "feat: add Vercel Cron Jobs for signals and price history"
   git push
   ```

3. Vercel automatycznie wykryje zmiany i zrobi deploy

### 3.2. Sprawdź logi cron jobs

1. W Vercel Dashboard, przejdź do **Deployments**
2. Wybierz najnowszy deployment
3. Kliknij **Functions** (lub **View Function Logs**)
4. Sprawdź logi funkcji `/api/admin/cron/generate-signals` i `/api/admin/cron/sync-price-history`

### 3.3. Monitoruj wykonania cron jobs

1. W Vercel Dashboard, przejdź do **Settings** → **Cron Jobs**
2. Kliknij na konkretny cron job
3. Zobaczysz historię wykonania:
   - Status (✅ Success / ❌ Failed)
   - Czas wykonania
   - Logi błędów (jeśli wystąpiły)

### 3.4. Testowanie ręczne (opcjonalnie)

Możesz przetestować endpointy ręcznie przed pierwszym automatycznym wykonaniem:

**Test generowania sygnałów:**

```bash
curl -X POST https://twoj-projekt.vercel.app/api/admin/cron/generate-signals \
  -H "Content-Type: application/json" \
  -H "X-CRON-SECRET: TWOJ_CRON_SECRET" \
  -d '{"symbol": "XAUUSD"}'
```

**Test synchronizacji cen:**

```bash
curl -X POST https://twoj-projekt.vercel.app/api/admin/cron/sync-price-history \
  -H "Content-Type: application/json" \
  -H "X-CRON-SECRET: TWOJ_CRON_SECRET" \
  -d '{"symbol": "XAUUSD"}'
```

## Krok 4: Dostosowanie harmonogramu (opcjonalnie)

Jeśli chcesz zmienić częstotliwość wykonywania cron jobs:

### 4.1. Przez Vercel Dashboard (zalecane)

1. **Settings** → **Cron Jobs**
2. Kliknij na cron job, który chcesz edytować
3. Zmień **Schedule** na nową wartość
4. Kliknij **Save**

**Przykładowe harmonogramy:**

- `*/15 * * * *` - co 15 minut
- `0 */2 * * *` - co 2 godziny
- `0 0 * * *` - codziennie o północy UTC
- `0 6,18 * * *` - codziennie o 06:00 i 18:00 UTC

### 4.2. Przez plik vercel.json

1. Edytuj `vercel.json` w repo:

   ```json
   {
     "crons": [
       {
         "path": "/api/admin/cron/generate-signals",
         "schedule": "*/30 * * * *" // co 30 minut
       },
       {
         "path": "/api/admin/cron/sync-price-history",
         "schedule": "0 6 * * *"
       }
     ]
   }
   ```

2. Commit i push:
   ```bash
   git add vercel.json
   git commit -m "chore: update cron schedule"
   git push
   ```

## Rozwiązywanie problemów

### Problem: Cron job zwraca 401 Unauthorized

**Przyczyna:** Brak lub nieprawidłowy header `X-CRON-SECRET`

**Rozwiązanie:**

1. Sprawdź czy `CRON_SECRET` jest ustawiony w Environment Variables
2. Sprawdź czy header `X-CRON-SECRET` jest dodany w konfiguracji cron job
3. Sprawdź czy wartość headeru jest poprawna (powinna być taka sama jak `CRON_SECRET` w ENV)

### Problem: Cron job zwraca 500 Server Error

**Przyczyna:** Brak lub nieprawidłowy `SUPABASE_SERVICE_ROLE_KEY`

**Rozwiązanie:**

1. Sprawdź czy `SUPABASE_SERVICE_ROLE_KEY` jest ustawiony w Environment Variables
2. Sprawdź czy klucz jest poprawny (skopiowany z Supabase Dashboard)
3. Sprawdź logi w Vercel Dashboard → Deployments → Functions

### Problem: Cron job nie wykonuje się automatycznie

**Przyczyna:** Cron job nie jest aktywowany lub harmonogram jest nieprawidłowy

**Rozwiązanie:**

1. Sprawdź czy cron job jest widoczny w **Settings** → **Cron Jobs**
2. Sprawdź czy harmonogram jest poprawny (format cron)
3. Sprawdź czy cron job jest włączony (nie ma statusu "Disabled")
4. Poczekaj na następne zaplanowane wykonanie (np. jeśli harmonogram to `0 * * * *`, poczekaj do pełnej godziny)

### Problem: Nie widzę cron jobs w Vercel Dashboard

**Przyczyna:** Plik `vercel.json` nie został jeszcze zdeployowany lub jest nieprawidłowy

**Rozwiązanie:**

1. Sprawdź czy `vercel.json` jest w repo
2. Zrób commit i push na `main`
3. Poczekaj na deploy
4. Sprawdź czy cron jobs pojawiły się w Dashboard (może zająć kilka minut)

## Podsumowanie

Po wykonaniu wszystkich kroków:

✅ **Zmienne środowiskowe ustawione:**

- `CRON_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

✅ **Cron jobs skonfigurowane:**

- `/api/admin/cron/generate-signals` - co godzinę
- `/api/admin/cron/sync-price-history` - codziennie o 06:00 UTC

✅ **Nagłówki autoryzacji dodane:**

- `X-CRON-SECRET` dla każdego cron job

✅ **Deploy wykonany:**

- Zmiany są na produkcji
- Cron jobs są aktywne

**Następne kroki:**

- Monitoruj logi w Vercel Dashboard
- Sprawdź czy sygnały są generowane automatycznie
- Sprawdź czy historia cen jest synchronizowana codziennie
