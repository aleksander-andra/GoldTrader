## 10x MVP Tracker — GoldTrader

Instrukcja użycia narzędzia: zobacz repozytorium 10x-mvp-tracker i uruchamiaj z poziomu Cursor: „Please report status of my project with check-mvp tool”.

Link: [GitHub – 10x-mvp-tracker](https://github.com/przeprogramowani/10x-mvp-tracker)

### Kryteria oceny (7)

- [x] Dokumentacja
  - [x] README uzupełnione o „Jak startujemy” i instrukcje ENV/Deploy
  - [x] PRD dostępny w `docs/PRD.md` (sekcja „MVP Scope (Etap 1)”)
  - [x] `docs/env.example` kompletne i aktualne

- [x] Logowanie (Auth)
  - [x] Supabase skonfigurowany (URL/KEY, `supabase.client.ts`, middleware)
  - [x] UI logowanie/rejestracja/wylogowanie
  - [x] RBAC (user/admin) — bez planów taryfowych w Etapie 1

- [x] Testy
  - [x] Playwright E2E: login ±, dashboard (chart + sygnały), CRUD assets (admin), generate‑signals — login + health + dashboard sygnałów + CRUD/generate‑signals po API działają, test UI CRUD assets admin **tymczasowo `skip` w CI** (działa lokalnie, patrz `docs/e2e-admin-admin-assets-ui.md`)
  - [ ] (opcjonalnie) testy kontraktowe API

- [x] Logika biznesowa
  - [x] Mock silnik sygnałów + top‑K/dzień
  - [x] Assets: CRUD (admin)
  - [ ] (Po MVP) Adapter providerów danych i forecasts

- [x] CI/CD
  - [x] GitHub Actions: lint, typecheck, test:e2e, build
  - [x] Vercel: Preview dla PR, produkcja na main
  - [ ] (Po MVP) Vercel Cron: `/api/admin/generate-signals`

- [x] Baza danych
  - [x] Schemat w Supabase: `profiles`, `assets`, `strategies`, `signals`
  - [x] Signals rozszerzone o status (candidate/accepted/rejected/expired), validity windows, evaluation fields
  - [x] RLS i seed (admin profil, XAUUSD)
  - [x] `src/db/database.types.ts` wygenerowany
  - [ ] (Po MVP) `plans`, `provider_config`, `forecasts`, `llm_queries`, `citations`

- [x] API (Etap 1 minimalny)
  - [x] `GET /api/health`
  - [x] `GET /api/assets`, `POST/PATCH/DELETE /api/assets` (admin)
  - [x] `GET /api/signals`
  - [x] `POST /api/admin/generate-signals`
  - [x] `GET /api/admin/signals/candidates`, `POST /api/admin/signals/accept`, `POST /api/admin/signals/reject`
  - [x] `POST /api/admin/signals/refresh-and-generate`, `POST /api/admin/price-history/sync`
  - [ ] (Po MVP) `GET/PUT /api/profile`, `GET /api/plans`, `GET/POST /api/admin/providers`
  - [ ] (Po MVP) `GET /api/prices`, SSE (`/api/stream/*`), `GET /api/forecasts`, LLM endpoints

### Widoki (dla szybkiego przeglądu postępu UI)

- [x] Dashboard: wykres XAUUSD (pull) + lista sygnałów + panel newsów (mock) z AI rekomendacją
- [x] Assets (admin): lista + formularz (create/edit/delete) — działa; E2E UI test admina tymczasowo `skip` (szczegóły w `docs/e2e-admin-admin-assets-ui.md`)
- [x] Signals (admin): panel zarządzania sygnałami — generowanie kandydatów, akceptacja/odrzucanie, synchronizacja historii cen
- [ ] (Po MVP) Admin panel: providerzy/ plany; LLM czat; overlay forecast; SSE live

### Ostatni raport (wklej tutaj wynik z „check-mvp")

```
10xDevs MVP status (check-mvp)
Overall: ~95% complete (MVP scope)

Documentation: OK
PRD in docs/PRD.md with clear MVP scope (Etap 1); docs/env.example complete and up-to-date
README has comprehensive "How to run locally" section with ENV setup, local admin seeding, and deploy-to-Vercel instructions
docs/env.cloud.example available for production deployment reference

Login (Auth): OK
Supabase configured (client + middleware); login/register/logout UI functional
RBAC (user/admin) fully implemented: profiles table with role field, RLS policies enforce admin-only access for assets/signals mutations
Admin role visible in UI (AuthNavClient shows admin badge); seed-admin script available for local setup

Tests: OK (MVP)
Comprehensive Playwright E2E test suite: login/dashboard, assets CRUD (API), news panel, forecast API, network checks, smoke tests.
Admin UI CRUD test (assets-admin-ui.spec.ts) runs locally (with optional video/trace) and is intentionally skipped in CI due to known Supabase browser login instability in headless environments.
Test coverage includes: assets (public + admin), signals, forecast endpoints, news panel, admin ping. CI runs full suite except the admin UI test, which is documented as a local-only scenario.

Business Logic: OK (MVP complete + post-MVP features)
Assets CRUD (admin) fully implemented over Supabase with RLS enforcement
Signals engine with status workflow: generation creates 'candidate' signals; admin can accept/reject via UI; accepted signals visible to users
Signal generation enhanced with configurable validity windows (valid_from/valid_to), lookback periods, and strategy selection
Forecast engine (baseline directional model) for XAUUSD: price_history sync from Alpha Vantage, feature engineering, model_runs/price_forecasts storage
News panel with Alpha Vantage integration (asset_events table with unique constraint on asset+source_url)
News recommendation AI (OpenAI) for contextual insights
Admin signals panel: full UI for generating, reviewing, accepting/rejecting candidate signals; price history sync integration

CI/CD: OK
GitHub Actions: lint (auto-fix), typecheck, build, smoke tests, E2E tests (Playwright)
Supabase Cloud migrations automated on main branch push (migrate-cloud job)
Vercel deployment: production on main, previews for PRs
Vercel Cron for /api/admin/generate-signals still planned post-MVP

Database: OK (MVP complete)
Core schema: profiles, assets, strategies, signals with full RLS policies
Signals table extended (migration 20251116): status (candidate/accepted/rejected/expired), validity windows (valid_from/valid_to), evaluation fields (forecast_price, realized_price, realized_direction, hit)
RLS policies: profiles (select own, update own, admin all), assets (read all authenticated, write admin only), signals (read all, write admin)
XAUUSD asset seeded via migration 20251111_seed_core_data.sql
Post-MVP tables implemented: price_history, price_forecasts, model_runs, asset_events, usage_counters (all with RLS)
Post-MVP tables not yet implemented: plans, provider_config, llm_queries, citations

API (Etap 1): OK (MVP complete + extensions)
Core MVP endpoints: GET /api/health, GET/POST/PATCH/DELETE /api/assets (admin CRUD), GET /api/signals, POST /api/admin/generate-signals
Signals management: GET /api/admin/signals/candidates, POST /api/admin/signals/accept, POST /api/admin/signals/reject, POST /api/admin/signals/refresh-and-generate
Forecast endpoints: GET /api/forecast/xauusd, GET /api/admin/forecast/baseline-metrics, GET /api/admin/forecast/history, POST /api/admin/sync-price-history
Price history: POST /api/admin/price-history/sync
News endpoints: GET /api/news/events, GET /api/news/recommendation, GET /api/news/health
Post-MVP endpoints not implemented: /api/profile, /api/plans, /api/admin/providers, /api/prices (SSE), /api/stream/*, LLM endpoints

Source tool: manual check in Cursor using 10x-mvp-tracker guidelines

Next 5 quick wins
1. Implement signal evaluation workflow: automatic status updates (expired signals), realized_price/realized_direction tracking, hit calculation
2. Add GET /api/forecast/history endpoint for UI overlay (currently only admin endpoint exists)
3. Add GET /api/profile endpoint for user profile display (currently only backend profile access)
4. Document and plan Vercel Cron setup for /api/admin/generate-signals, /api/admin/sync-price-history, and signal expiration checks (post-MVP)
5. Add basic observability/metrics dashboard: signal acceptance rate, forecast accuracy, news recommendation quality, signal hit rate
```

### Historia raportów

| Data       | Ukończenie | Najważniejsze rekomendacje                                                                                                                                                            |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-11-05 | ~35%       | README run guide; assets by id; seed XAUUSD/RLS; CI smoke; Playwright baseline                                                                                                        |
| 2025-11-29 | ~55%       | CI + Supabase Cloud migrations; Vercel deploy; assets CRUD over Supabase; env.cloud wiring                                                                                            |
| 2025-11-30 | ~65%       | Signals mock engine + dashboard list; GET /api/signals + POST /api/admin/generate-signals; Playwright E2E w CI                                                                        |
| 2025-12-07 | ~75%       | Forecast engine + price history/price_forecasts/model_runs; Alpha Vantage news ingest; rozszerzone testy E2E                                                                          |
| 2025-12-XX | ~80%       | RLS policies complete; Auth UI with admin badge; comprehensive test coverage; forecast/news endpoints operational                                                                     |
| 2025-12-XX | ~95%       | Admin signals panel with accept/reject workflow; signal status management (candidate/accepted/rejected/expired); enhanced signal generation with validity windows; price history sync |

### Notatki i decyzje

- Krótkie zapiski z przeglądów, decyzje architektoniczne, zmiany zakresu.
