# GoldTrader — Product Requirements Document (PRD)

## MVP Scope (Etap 1 — zgodnie z 10xDevs)
- W tym etapie realizujemy minimalny, działający pion:
  - Auth: Supabase (login/rejestracja), SSR walidacja sesji; role: user/admin
  - Assets: CRUD tylko dla admin (lista + formularz) – XAUUSD jako aktywo referencyjne
  - Strategies & Signals: strategia „mock”, generowanie top‑K=10 sygnałów/dzień (UTC)
  - Dashboard: wykres XAUUSD (pull, bez SSE) + lista sygnałów
  - API: minimalny zestaw endpointów (health, assets CRUD admin, signals list, admin generate‑signals)
  - Testy E2E: login ±, CRUD assets, generate‑signals
  - CI/CD: Actions + Vercel (Preview/Prod)
- Świadomie pomijamy w Etapie 1: LLM Assistant, SSE (ceny/sygnały), plany taryfowe (FREE/STANDARD/PRO), forecasts (prognozy), rozbudowany provider_config (przełączanie providerów), dzienne limity per plan.

## Po MVP (Etap 2+ — rozszerzenia)
- LLM Assistant (endpoints + `llm_queries`/`citations`, streaming + cytaty)
- SSE dla cen i sygnałów, heartbeat, limity połączeń
- Plany taryfowe i limity dzienne (FREE/STANDARD/PRO)
- Forecasts (tabela + endpoint), overlay na wykresie
- Przełączanie providerów danych i LLM (bogatszy `provider_config`), rate limit, dodatkowe NFR

## 1. Cel i zakres
Celem MVP GoldTrader jest webowa aplikacja tradingowa skoncentrowana na rynku złota (XAUUSD), dostarczająca: wykres ceny złota, prognozę (na start mock) oraz sygnały tradingowe (top-K dziennie), z rolami user/admin i planami Free/Standard/Pro. LLM-asystent z web search tylko dla Pro. Realtime przez SSE. Backend w Astro API Routes (SSR). Dane rynkowe przez adapter: Metals-API lub Twelve Data (konfigurowalne, z mock fallback).

## 2. Persony i role
- Gość: widzi landing, CTA do rejestracji.
- Użytkownik (Free/Standard/Pro): logowanie przez Supabase (email+hasło). Ograniczenia wg planu: limity sygnałów/dzień, dostęp do danych/LLM.
- Admin: nadaje/zmienia plany, przełącza dostawców danych i LLM, wgląd w użycie limitów.

## 3. User Journeys
- Rejestracja i logowanie: użytkownik tworzy konto, potwierdza email, loguje się.
- Przegląd rynku: na Dashboardzie widzi wykres XAUUSD (Lightweight Charts), overlay prognozy (mock), panel „Sygnały” (top-K dnia).
- Lista sygnałów: przegląd historycznych sygnałów z filtrami (data, kierunek).
- LLM (Pro): użytkownik wpisuje pytanie; dostaje odpowiedź streamingiem (SSE) + cytaty ze źródeł (SerpAPI/NewsAPI).
- Admin: w panelu wybiera aktywnego dostawcę danych (Metals-API/TwelveData/Mock), aktywnego dostawcę LLM (OpenAI/Anthropic), nadaje plan użytkownikowi.

## 4. Wymagania funkcjonalne
- Auth (Supabase)
  - Rejestracja, logowanie, reset hasła, weryfikacja email.
  - Profile: role (user/admin), plan, liczniki dzienne (sygnały, LLM).
- Assets
  - MVP: jedno aktywo XAUUSD (spot).
- Strategies
  - MVP: silnik sygnałów wtyczkowy (interfejs), implementacja „mock-strategy” generująca kandydatów i wybierająca top-K/dzień.
- Signals
  - Generacja periodyczna (Cron) lub on-demand (admin). Emisja realtime przez SSE.
  - Limity planów: Free 3/d, Standard 10/d, Pro 60/d (egzekwowane).
- LLM Asystent (Pro)
  - Dostawcy przełączalni: OpenAI/Anthropic. Web search/news: SerpAPI + NewsAPI (adapter). Stream + cytaty.
- Admin
  - Przełączanie providerów danych i LLM; nadawanie planów użytkownikom.

## 5. ERD (ASCII)
Notacja: pk=PRIMARY KEY, fk=FOREIGN KEY, uq=UNIQUE, nn=NOT NULL; Typy: uuid, text, varchar(n), int, numeric(18,6), boolean, timestamptz, jsonb

Uwaga (zakres): Tabele `forecasts`, `llm_queries`, `citations` realizujemy „Po MVP”.

```
+-------------------+-----------------------------------------------+
| users (Supabase)  | id uuid pk, email text uq nn, created_at ts   |
+-------------------+-----------------------------------------------+

+-------------------+-----------------------------------------------+
| profiles          | id uuid pk fk->users.id                       |
|                   | role varchar(10) nn default 'user'            |
|                   | plan_code varchar(10) nn default 'FREE'       |
|                   | plan_assigned_at timestamptz nn               |
|                   | llm_used_today int nn default 0               |
|                   | signals_used_today int nn default 0           |
|                   | reset_counters_at date nn (UTC day)           |
+-------------------+-----------------------------------------------+

+-------------------+-----------------------------------------------+
| plans             | id uuid pk                                    |
|                   | code varchar(10) uq nn                        |
|                   | name varchar(50) nn                           |
|                   | daily_signals_limit int nn                    |
|                   | daily_llm_limit int nn                        |
|                   | notes text                                    |
+-------------------+-----------------------------------------------+

+-------------------+-----------------------------------------------+
| assets            | id uuid pk                                    |
|                   | symbol varchar(20) uq nn ('XAUUSD')           |
|                   | name varchar(100) nn                          |
|                   | type varchar(10) nn ('SPOT','ETF','FUT')      |
|                   | currency varchar(10) nn                       |
|                   | provider_symbol varchar(50)                   |
|                   | is_active boolean nn default true             |
+-------------------+-----------------------------------------------+

+-------------------+-----------------------------------------------+
| provider_config   | id uuid pk (singleton row)                    |
|                   | data_provider varchar(20) nn                  |
|                   | llm_provider varchar(20) nn                   |
|                   | search_provider varchar(20) nn default 'SERP+NEWS'|
|                   | created_at timestamptz nn                     |
|                   | updated_at timestamptz nn                     |
+-------------------+-----------------------------------------------+

+-------------------+-----------------------------------------------+
| forecasts         | id uuid pk                                    |
|                   | asset_id uuid fk->assets.id                   |
|                   | model varchar(50) nn ('mock-v1')              |
|                   | horizon varchar(10) nn ('intraday')           |
|                   | created_at timestamptz nn                     |
|                   | forecast jsonb nn  (array[{ts, price}])       |
+-------------------+-----------------------------------------------+

+-------------------+-----------------------------------------------+
| signals           | id uuid pk                                    |
|                   | asset_id uuid fk->assets.id                   |
|                   | created_at timestamptz nn                     |
|                   | direction varchar(5) nn ('BUY','SELL')        |
|                   | entry_price numeric(18,6) nn                  |
|                   | stop_loss_pct numeric(5,2) nn                 |
|                   | target_rr numeric(5,2) nn                     |
|                   | confidence int nn check 0..100                |
|                   | rationale text                                |
|                   | status varchar(10) nn default 'new'           |
|                   | expires_at timestamptz                        |
|                   | generated_by varchar(50) nn                   |
|                   | quality_score numeric(6,3)                    |
+-------------------+-----------------------------------------------+

+-------------------+-----------------------------------------------+
| llm_queries       | id uuid pk                                    |
|                   | user_id uuid fk->users.id                     |
|                   | question text nn                              |
|                   | model varchar(50) nn                          |
|                   | tokens_in int                                 |
|                   | tokens_out int                                |
|                   | created_at timestamptz nn                     |
+-------------------+-----------------------------------------------+

+-------------------+-----------------------------------------------+
| citations         | id uuid pk                                    |
|                   | llm_query_id uuid fk->llm_queries.id          |
|                   | source_url text nn                            |
|                   | title text                                    |
|                   | snippet text                                  |
|                   | published_at timestamptz                      |
+-------------------+-----------------------------------------------+
```

## 6. Kontrakt API (Astro /api/*, Auth: Supabase JWT)
- Health
  - GET /api/health → 200: { status: "ok", time: "…" } | 500
- Profile
  - GET /api/profile → 200: { id, email, role, plan_code, daily: { signals_used, llm_used, reset_at } } | 401/403
  - PUT /api/profile → req: { display_name? } → 200 { ok: true } | 400/401/403
- Plans
  - GET /api/plans → 200: [{ code, name, daily_signals_limit, daily_llm_limit, notes }]
- Admin
  - POST /api/admin/assign-plan → req: { user_id, plan_code } → 200 { ok: true } | 400/401/403/404
  - GET /api/admin/providers → 200: { data_provider, llm_provider, search_provider }
  - POST /api/admin/providers → req: { data_provider?, llm_provider? } → 200 { ok: true, updated }
- Assets
  - GET /api/assets → 200: [...]
  - GET /api/assets/:id → 200 | 404
- Prices (pull)
  - GET /api/prices?symbol=XAUUSD&range=1d → 200: { symbol, candles: [{ t, o,h,l,c,v }] } | 400/503
- Prices (SSE)
  - GET /api/stream/prices?symbol=XAUUSD → SSE: data: { t, price }
- Forecasts
  - GET /api/forecasts?symbol=XAUUSD → 200 { model, forecast[] } | 404
- Signals
  - GET /api/signals?symbol=XAUUSD&from=&to= → 200: [...] (rationale, confidence, itd.)
  - GET /api/stream/signals?symbol=XAUUSD → SSE nowych sygnałów
  - POST /api/admin/generate-signals → 201 { generated, kept_top_k } | 400/401/403/503
- LLM Assistant (Pro)
  - POST /api/llm/query → req: { question, stream?, include_citations? } → 200 non-stream/stream

## 7. Reguły biznesowe i walidacje
- Dostęp do LLM tylko dla planu Pro; limit 100 zapytań/dzień; 429 po przekroczeniu; reset liczników 00:00 UTC.
- Limity sygnałów/dzień: Free 3, Standard 10, Pro 60; filtrowanie top-K per plan.
- MVP aktywa: tylko XAUUSD (rozszerzenia później).
- Admin może zmieniać aktywnych providerów; zapis w `provider_config`.
- Walidacje sygnału: 0 ≤ confidence ≤ 100; stop_loss_pct > 0 i < 20; target_rr ≥ 1.0; expires_at ≥ created_at.
- SSE: max 1 stream ceny + 1 stream sygnałów na użytkownika; heartbeat 20–30s.
- Rate limit API: 60 req/min/user (poza SSE).
- Bezpieczeństwo: tylko admin dla /admin/*; Cron podpisywany `X-CRON-SIGNATURE`.

## 8. NFR (wydajność, bezpieczeństwo, obserwowalność)
- Wydajność: SSE opóźnienie < 2s; średnia latencja API < 300ms; cache cen 60s po stronie funkcji.
- Bezpieczeństwo: JWT Supabase; RBAC; sekrety w ENV; zod walidacja; sanitizacja outputu.
- Observability: strukturalne logi (request_id, user_id, route, status, duration); Sentry (opcjonalnie); alert na 5xx > 2%/5min.
- Dostępność: cel 99.5% (best effort Vercel) w MVP.

## 9. Test Strategy (Playwright E2E)
- Scenariusze: rejestracja/logowanie; Dashboard (wykres + panel sygnałów); SSE (eventy); limity planów; brak LLM dla Free/Standard; Admin: zmiana providerów i nadanie planu; API kontrakty.
- Mocki: dostawcy danych (Metals-API/Twelve Data) i LLM (OpenAI/Anthropic), SerpAPI/NewsAPI.

## 10. Plan CI/CD i sekrety
- CI: GitHub Actions – lint, typecheck, test:e2e (mock), build.
- CD: Vercel – Preview dla PR, Prod na main. Vercel Cron do `/api/admin/generate-signals` (np. co 5 min) z `X-CRON-SIGNATURE`.
- Sekrety (ENV): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (server only), METALS_API_KEY, TWELVE_DATA_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, SERPAPI_KEY, NEWSAPI_KEY, CRON_SIGNATURE.

## 11. Jak użyto AI (proces i guardrails)
- W repo: reguły dla agentów (np. Cursor) – konwencje commitów, zakaz commitowania sekretów, konwencje modułów.
- Guardrails: skan commitów pod kątem sekretów; testy muszą przejść w CI; deterministic prompts (niska temperatura) dla generowania szablonów.

## 12. Plan rozwoju po MVP
- Modele prognoz: ARIMA/Prophet, XGBoost, LSTM/Transformer; selekcja po backtestach (walk-forward, Sharpe, PF).
- Stripe (subskrypcje), PWA + push, e-mail/webhook, multi-asset watchlista, backtesting UI, raporty skuteczności.

## 13. Definition of Ready (DoR)
- User story z akceptacją, zdefiniowane API/ERD, mocki providerów, kryteria limitów, design szkic.

## 14. Definition of Done (DoD)
- Kod, testy E2E/kontraktowe zielone, review 2×, wdrożenie na preview + prod, monitorowanie, aktualna dokumentacja.
