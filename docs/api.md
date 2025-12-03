## GoldTrader API — podsumowanie (MVP)

Poniżej krótki opis dostępnych endpointów API w Etapie 1 (MVP). Wszystkie endpointy są serwowane przez Astro (`src/pages/api/*`). Szczegółowy kontrakt znajdziesz w `docs/PRD.md` (sekcja „Kontrakt API”).

### Health

- **GET** `/api/health`
  - **Auth**: brak
  - **200**: `{ "status": "ok", "time": "..." }` — prosta sonda zdrowia aplikacji.

### Ceny (mock) — XAUUSD

- **GET** `/api/prices?symbol=XAUUSD&range=1d`
  - **Auth**: brak (publiczny mock)
  - **200**:

    ```jsonc
    {
      "symbol": "XAUUSD",
      "range": "1d",
      "candles": [{ "t": 1710000000000, "o": 2400, "h": 2405, "l": 2395, "c": 2402 }],
    }
    ```

  - **Uwagi**: Dane są mockowane na backendzie; służą jako źródło dla wykresu XAUUSD na dashboardzie.

### Assets (admin)

- **GET** `/api/assets`
  - **Auth**: token Supabase w nagłówku `Authorization: Bearer <jwt>`
  - **RLS**:
    - `anon` / `authenticated`: odczyt listy aktywów dozwolony,
    - mutacje tylko dla `admin` (sprawdzenie w `public.profiles.role`).

- **GET** `/api/assets/:id`
  - **Auth**: jak wyżej.

- **POST** `/api/assets` (admin only)
  - **Body**: `{ "symbol": string, "name": string, "currency": string }`
  - **201**: `{ id, symbol, name, currency, created_at }`

- **PATCH** `/api/assets/:id` (admin only)
  - **Body**: częściowa aktualizacja `{ symbol?, name?, currency? }`

- **DELETE** `/api/assets/:id` (admin only)

### Sygnały (mock)

- **GET** `/api/signals?symbol=XAUUSD`
  - **Auth**: token Supabase (`anon` / `authenticated`)
  - **RLS**: odczyt dozwolony dla `anon` i `authenticated` (dashboard).
  - **Zwraca**: listę sygnałów (mock) dla XAUUSD, używaną na dashboardzie.

### Admin — generowanie sygnałów (mock)

- **POST** `/api/admin/generate-signals`
  - **Auth**:
    - token Supabase z rolą `admin` w `public.profiles.role`,
    - nagłówek `Authorization: Bearer <jwt>`.
  - **Body (opcjonalne)**: `{ "symbol"?: string, "count"?: number }`
    - `symbol` domyślnie `XAUUSD`,
    - `count` domyślnie `10` (zabezpieczone do max 50).
  - **Limity**:
    - dzienny limit wywołań per admin egzekwowany przez `enforceDailyLimit("signals:generate", 20)`.
  - **201**: `{ ok: true, generated, kept_top_k, items: [...] }`
  - Endpoint służy do generowania mockowych sygnałów na potrzeby dashboardu i testów E2E.
