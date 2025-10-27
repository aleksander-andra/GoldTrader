## 1. Wizja, cel i zakres (MVP vs poza zakresem)
- Cel: Prosty serwis dla inwestora indywidualnego do podglądu ceny złota (XAUUSD), listy czytelnych sygnałów BUY/SELL i podstawowych metryk skuteczności – bez skomplikowanej konfiguracji.
- Problem: Brak lekkiego narzędzia łączącego dane XAUUSD z prostymi sygnałami tradingowymi; istniejące platformy są złożone/rozproszone.
- Zakres MVP:
  - Auth/ACL: rejestracja/logowanie (Supabase Auth), role: user/admin; sesja JWT w cookie HttpOnly.
  - Assets: CRUD prostych aktywów (UI: lista + formularz). W MVP aktywo referencyjne: XAUUSD.
  - Strategies & Signals: interfejs strategii + „mock strategy”, generowanie top‑K sygnałów/dzień (K=10); widok listy sygnałów.
  - UI: Dashboard z wykresem XAUUSD + panel sygnałów.
  - Testy: ≥2 scenariusze E2E (login ±, CRUD assets, generate‑signal).
  - CI/CD: GitHub Actions + Vercel (Preview/Prod).
- Poza zakresem MVP: Handel live/brokerzy, płatności/subskrypcje, push/powiadomienia, multi‑asset portfolio, backtesting/ML, LLM‑asystent, aplikacje mobilne, SSE realtime.

## 2. Persony, role i uprawnienia (ACL)
- Persony:
  - User: zalogowany użytkownik, przegląda dashboard (wykres XAUUSD, lista sygnałów), czyta assets i signals.
  - Admin: zarządza danymi (CRUD assets), wywołuje generowanie sygnałów, zarządza providerem danych (po MVP).
- Uprawnienia (MVP):
  - Odczyt: zalogowani użytkownicy mogą czytać dane (assets, signals).
  - Modyfikacje: tylko admin (CRUD assets, generate‑signals).
  - Strefa admin: ścieżki pod `/api/admin/*`.
- RLS (Supabase DB): SELECT dopuszczony dla zalogowanych (shared read), INSERT/UPDATE/DELETE ograniczony do adminów.

## 3. User Journeys (UJ‑1..n) z krótkimi flow
- UJ‑1: Login (user/admin)
  - Wejście na `/login` → formularz email/hasło → sukces: redirect na `/dashboard`, porażka: błąd walidacji.
- UJ‑2: Przegląd dashboardu (user)
  - `/dashboard` SSR: wykres XAUUSD (ostatni zakres), lista sygnałów (top‑K, sort po confidence), stany loading/empty/error.
- UJ‑3: CRUD assets (admin)
  - `/assets`: lista → „Add asset” modal → zapis → widok listy z nową pozycją → edycja/usuwanie.
- UJ‑4: Generate signals (admin)
  - Akcja w UI lub POST `/api/admin/generate-signals` → odświeżenie listy sygnałów na dashboardzie.

## 4. Wymagania funkcjonalne (Auth, Assets, Strategies, Signals, Admin)
- Auth:
  - Rejestracja/logowanie via Supabase Auth (email+hasło), sesja w cookie HttpOnly, SSR walidacja sesji.
- Assets:
  - Pola: symbol, name, currency, qty, avg_price; walidacje `qty ≥ 0`, `avg_price ≥ 0`; ACL: CRUD tylko admin.
- Strategies:
  - Definicja strategii mock (np. prosta reguła SMA crossover), konfig w `strategies` (MVP minimalne).
- Signals:
  - Generowanie top‑K (K=10) sygnałów dziennie w UTC; typ: BUY/SELL/HOLD; confidence 0..100; lista z paginacją/sortem.
- Admin:
  - Endpoint do generowania sygnałów; przełączanie providerów danych (Metals‑API / TwelveData / Mock) – po MVP.

## 5. Model danych (ERD ASCII + klucze/indeksy; jeśli Supabase Auth → bez własnej tabeli users)
```
auth.users (Supabase) --(1:1)--> profiles
profiles (
  user_id PK (uuid, = auth.users.id),
  role text CHECK IN ('admin','user') NOT NULL,
  plan text DEFAULT 'free',
  created_at timestamptz DEFAULT now()
)

assets (
  id uuid PK DEFAULT gen_random_uuid(),
  symbol text NOT NULL, -- 'XAUUSD'
  name text NOT NULL,
  currency text NOT NULL, -- 'USD'
  qty numeric(18,6) NOT NULL CHECK (qty >= 0),
  avg_price numeric(18,6) NOT NULL CHECK (avg_price >= 0),
  created_at timestamptz DEFAULT now()
)
-- global read (shared); mutacje tylko admin

strategies (
  id uuid PK DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL, -- 'mock'
  params_json jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL CHECK (status IN ('active','draft')),
  created_at timestamptz DEFAULT now()
)

signals (
  id uuid PK DEFAULT gen_random_uuid(),
  strategy_id uuid REFERENCES strategies(id),
  ts timestamptz NOT NULL,
  type text NOT NULL CHECK (type IN ('BUY','SELL','HOLD')),
  confidence int NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  meta_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
)

provider_config (P1)
(
  id uuid PK DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('metalsapi','twelvedata','mock')),
  api_key text,
  active bool DEFAULT false,
  created_at timestamptz DEFAULT now()
)
```
- Indeksy:
  - `signals(ts DESC)`, `signals(strategy_id, ts DESC)`, `strategies(status)`.
- RLS (koncepcyjnie):
  - `USING` dla SELECT: `auth.role() IN ('admin','user')`.
  - `WITH CHECK` dla mutacji: `auth.role() = 'admin'`.

## 6. Kontrakt API (OpenAPI‑like: ścieżki, request/response, kody)
- Auth (Supabase – kliencki flow). Sesja: cookie HttpOnly ustawiane przez Supabase; SSR waliduje.
- Assets (CRUD, admin only na mutacje)
  - GET `/api/assets`
    - 200: lista
    ```json
    { "items": [{ "id": "uuid", "symbol": "XAUUSD", "name": "Gold", "currency": "USD", "qty": 1.0, "avg_price": 2000.0, "created_at": "..." }], "total": 1 }
    ```
  - POST `/api/assets` (admin)
    - body:
    ```json
    { "symbol": "XAUUSD", "name": "Gold", "currency": "USD", "qty": 1.0, "avg_price": 2000.0 }
    ```
    - 201: zasób; 400 walidacja; 401/403 ACL.
  - PATCH `/api/assets/{id}` (admin)
    - body: pola częściowe; 200: zaktualizowany; 404: brak; 401/403.
  - DELETE `/api/assets/{id}` (admin)
    - 204: bez treści; 404; 401/403.
- Signals
  - GET `/api/signals?limit=K&offset=O&strategy=mock`
    - 200:
    ```json
    { "items": [{ "id":"uuid","strategy_id":"uuid","ts":"...","type":"BUY","confidence":87,"meta_json":{} }], "total": 10 }
    ```
- Admin
  - POST `/api/admin/generate-signals`
    - body:
    ```json
    { "strategy": "mock", "topK": 10 }
    ```
    - 202: przyjęto/zwraca liczbę wygenerowanych; 401/403.

- Błędy (format)
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid qty", "details": { "qty": "must be >= 0" } } }
```

## 7. Reguły biznesowe i walidacje (np. confidence 0..100, RR ≥ 1.0)
- Signals:
  - Dzienny limit: top‑K=10 na UTC‑dzień; typ ∈ {BUY, SELL, HOLD}; confidence ∈ [0,100].
  - Generowanie wyłącznie przez admina. Każde wywołanie nie przekracza K/dzień (idempotencja względem daty).
- Assets:
  - `qty ≥ 0`, `avg_price ≥ 0`.
- Wykres:
  - Zakres: ostatnie 7 dni (MVP), cache TTL danych rynkowych (np. 60 s).
- ACL:
  - SELECT dla zalogowanych, mutacje tylko admin (assets, generate‑signals).

## 8. Niefunkcjonalne (wydajność, bezpieczeństwo, obserwowalność)
- Wydajność/KPI:
  - API latency (mock): p50 < 300 ms; TTI dashboard < 5 s; błędy 5xx < 2%/5 min (dev/prod).
- Bezpieczeństwo:
  - Sesje w cookie HttpOnly; nagłówki: `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`; CSP (P1).
  - Sekrety w ENV (Vercel/Actions), brak w repo.
- Obserwowalność:
  - Logi requestów (status, latency), licznik 5xx, prosty healthcheck `/api/health`.

## 9. Test Strategy (Playwright E2E scenariusze + artefakty)
- Scenariusze:
  - S1: Login pozytywny i negatywny (błędne hasło).
  - S2: CRUD assets (admin): create → edit → delete → weryfikacja na liście.
  - S3: Generate‑signal (admin) → widoczny na dashboardzie (lista sygnałów).
- Zasady:
  - Stabilne `data-testid`, mock providera danych w testach, artefakty (screenshots/video/trace) w CI.
  - Smoke dla Preview URL (SSR `/` 200).

## 10. UI/UX (widoki, stany błędów/pustki; SSR/prerender wskazówki Astro)
- Widoki:
  - `/login`: formularz, błędy walidacji, link do rejestracji (Supabase).
  - `/dashboard`: wykres XAUUSD, lista sygnałów (sort po confidence desc), stany: loading/empty/error.
  - `/assets`: lista + modal formularza (admin), walidacje inline.
- SSR/Prerender:
  - SSR danych krytycznych (dashboard), caching na warstwie serwera (TTL).
  - Skeletons dla ładowania; błędy komunikowane spójnie.

## 11. CI/CD i środowiska (pipeline kroki, Preview/Prod; sekrety/ENV)
- Platforma: GitHub Actions + Vercel (Preview/Prod).
- Pipeline (Actions):
  - `lint` (ESLint/Prettier), `build` (Astro), `e2e` (Playwright na Preview z mockiem providera).
  - Blokada merge, jeśli `e2e` czerwone.
- Sekrety/ENV: zarządzane w GitHub Secrets/Vercel Project Settings.
- Hosting: Vercel; adapter Astro odpowiedni dla Vercel (do uwzględnienia w implementacji).

## 12. Bezpieczeństwo (RLS/ACL, rate limit, nagłówki)
- RLS: SELECT dla zalogowanych; INSERT/UPDATE/DELETE tylko admin – polityki per tabela.
- Rate limit: poza MVP (P2).
- Nagłówki i najlepsze praktyki: jw. w sekcji NFR; ochrona CSRF przez cookie HttpOnly + `SameSite=Lax`.

## 13. Plan migracji i seed (kolejność; dane startowe)
- Kolejność:
  1) Tabele: `profiles`, `assets`, `strategies`, `signals`, `provider_config` (P1).
  2) Indeksy, constraints.
  3) Polityki RLS.
  4) Seed: admin profil, przykładowa strategia `mock`, przykładowe assets/sygnały.
- Reset dobowy: logika top‑K odnosi się do granicy 00:00 UTC.

## 14. Ryzyka i mitigacje
- Niedomknięcie E2E na czas → P0: auth+CRUD+logika, minimalny UI.
- Problemy providerów danych → adapter + MOCK fallback, cache+retry.
- Błędy ENV/sekretów → `.env.example` + README CI/CD, weryfikacja w buildzie.
- Zmiana adaptera (Vercel vs Node) → decyzja utrzymana: Vercel; test w Preview.

## 15. Roadmap (Sprint 0..3 z DoD)
- Sprint 0 (setup): Supabase, skeleton UI, CI/CD, `.env.example`, podstawowe endpointy GET.
- Sprint 1 (Auth/CRUD): Login ±, Assets CRUD (admin), E2E S1–S2 zielone.
- Sprint 2 (Signals): Strategia mock, generate‑signals API, lista sygnałów, E2E S3, KPI pomiary.
- Sprint 3 (P1): Dashboard wykres, provider_config (read only), dokumentacja, hardening NFR.

## 16. DoR/DoD (checklisty)
- DoR (zadanie gotowe, gdy): cel, AC, UI szkic, kontrakt API, wpływ na DB/RLS, testy E2E zaplanowane, ENV zidentyfikowane.
- DoD (zadanie zakończone, gdy): lint/build OK, testy jednostkowe/E2E zielone, dokumentacja zaktualizowana (PRD/README), wdrożone na Preview.

## 17. Checklista „na zielono” pod certyfikat (odhaczalna)
- [x] Auth/ACL: Supabase Auth, role admin/user, RLS.
- [x] CRUD: Assets API + UI, ACL dla mutacji (admin only).
- [x] Logika biznesowa: generate‑signals (mock, K=10/dzień UTC).
- [x] E2E: login ±, CRUD assets, generate‑signal.
- [x] CI/CD: GitHub Actions + Vercel (Preview/Prod) z artefaktami testów.
- [x] PRD: dokument w repo (sekcje 1–17 kompletne).

### User Stories z AC (Given/When/Then)
- Auth – login pozytywny
  - Given: Zarejestrowany user z ważnym hasłem
  - When: Loguje się poprawnymi danymi
  - Then: Widzi dashboard; cookie sesyjne ustawione; brak błędów
- Auth – login negatywny
  - Given: Zarejestrowany user
  - When: Podaje złe hasło
  - Then: Otrzymuje błąd walidacji; pozostaje na `/login`
- Assets – create (admin)
  - Given: Admin na `/assets`
  - When: Wypełnia formularz i zapisuje
  - Then: Nowy asset widoczny na liście; walidacje `qty ≥ 0`, `avg_price ≥ 0`
- Assets – edit/delete (admin)
  - Given: Istniejący asset
  - When: Edytuje pola / usuwa
  - Then: Zmiany zapisane / asset znika z listy
- Signals – generate (admin)
  - Given: Strategia `mock` aktywna
  - When: Wywoła `/api/admin/generate-signals`
  - Then: Na dashboardzie widzi do K=10 nowych sygnałów (UTC‑dzień), posortowane po confidence

### Zmienne środowiskowe (.env.example)
```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # tylko po stronie serwera/CI

# Provider danych rynkowych (P1 / mock w MVP)
DATA_PROVIDER=mock           # metalsapi | twelvedata | mock
METALS_API_KEY=
TWELVEDATA_API_KEY=
DATA_CACHE_TTL=60            # sekundy

# Aplikacja
NODE_ENV=development
APP_URL=http://localhost:3000
JWT_COOKIE_NAME=supabase-auth
```
