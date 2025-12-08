## 10x MVP Tracker — GoldTrader

Instrukcja użycia narzędzia: zobacz repozytorium 10x-mvp-tracker i uruchamiaj z poziomu Cursor: „Please report status of my project with check-mvp tool”.

Link: [GitHub – 10x-mvp-tracker](https://github.com/przeprogramowani/10x-mvp-tracker)

### Kryteria oceny (7)

- [x] Dokumentacja
  - [x] README uzupełnione o „Jak startujemy” i instrukcje ENV/Deploy
  - [x] PRD dostępny w `docs/PRD.md` (sekcja „MVP Scope (Etap 1)”)
  - [x] `docs/env.example` kompletne i aktualne

- [ ] Logowanie (Auth)
  - [x] Supabase skonfigurowany (URL/KEY, `supabase.client.ts`, middleware)
  - [x] UI logowanie/rejestracja/wylogowanie
  - [x] RBAC (user/admin) — bez planów taryfowych w Etapie 1

- [ ] Testy
  - [ ] Playwright E2E: login ±, dashboard (chart + sygnały), CRUD assets (admin), generate‑signals — login + health + dashboard sygnałów + CRUD/generate‑signals po API działają, test UI CRUD assets admin **tymczasowo `skip`** (patrz `docs/e2e-admin-admin-assets-ui.md`)
  - [ ] (opcjonalnie) testy kontraktowe API

- [ ] Logika biznesowa
  - [x] Mock silnik sygnałów + top‑K/dzień
  - [x] Assets: CRUD (admin)
  - [ ] (Po MVP) Adapter providerów danych i forecasts

- [ ] CI/CD
  - [x] GitHub Actions: lint, typecheck, test:e2e, build
  - [x] Vercel: Preview dla PR, produkcja na main
  - [ ] (Po MVP) Vercel Cron: `/api/admin/generate-signals`

- [ ] Baza danych
  - [x] Schemat w Supabase: `profiles`, `assets`, `strategies`, `signals`
  - [ ] RLS i seed (admin profil, XAUUSD)
  - [x] `src/db/database.types.ts` wygenerowany
  - [ ] (Po MVP) `plans`, `provider_config`, `forecasts`, `llm_queries`, `citations`

- [ ] API (Etap 1 minimalny)
  - [x] `GET /api/health`
  - [x] `GET /api/assets`, `POST/PATCH/DELETE /api/assets` (admin)
  - [x] `GET /api/signals`
  - [x] `POST /api/admin/generate-signals`
  - [ ] (Po MVP) `GET/PUT /api/profile`, `GET /api/plans`, `GET/POST /api/admin/providers`
  - [ ] (Po MVP) `GET /api/prices`, SSE (`/api/stream/*`), `GET /api/forecasts`, LLM endpoints

### Widoki (dla szybkiego przeglądu postępu UI)

- [x] Dashboard: wykres XAUUSD (pull) + lista sygnałów + panel newsów (mock) z AI rekomendacją
- [x] Assets (admin): lista + formularz (create/edit/delete) — działa; E2E UI test admina tymczasowo `skip` (szczegóły w `docs/e2e-admin-admin-assets-ui.md`)
- [ ] (Po MVP) Admin panel: providerzy/ plany; LLM czat; overlay forecast; SSE live

### Ostatni raport (wklej tutaj wynik z „check-mvp”)

```
10xDevs MVP status (check-mvp)
Overall: ~75% complete

Documentation: OK
PRD in docs/PRD.md; docs/env.example and docs/env.cloud.example present
README has up-to-date "How to run locally" + ENV + deploy-to-Vercel/ENV.cloud sections

Login (Auth): PARTIAL
Supabase Cloud configured; middleware + login/register/logout + reset hasła OK
RBAC (user/admin) działa w API (profiles.role), UI ról nadal minimalny (role widoczne głównie w backendzie)

Tests: PARTIAL (improved)
Smoke script (npm run smoke) plus rozszerzony zestaw Playwright E2E: login/dashboard, assets (admin CRUD po API), news panel, forecast API (/api/forecast/xauusd, /api/admin/forecast/baseline-metrics), network checks.
E2E test UI CRUD assets admin nadal częściowo `skip`, ale główne ścieżki biznesowe są pokryte testami.

Business Logic: PARTIAL (MVP complete + część „Po MVP”)
Assets CRUD (admin) implemented over Supabase; mock signals engine + POST /api/admin/generate-signals + dashboard list for XAUUSD gotowe.
Dodany prosty forecast engine dla XAUUSD oparty na historycznych świecach dziennych (price_history) z feature engineeringiem i baseline modelem kierunkowym; wyniki zapisywane do price_forecasts/model_runs.
Panel newsów korzysta z Alpha Vantage (asset_events z unikalnością po (asset, source_url)); agregator newsów dostępny na dashboardzie.

CI/CD: OK
GitHub Actions: lint + build + smoke + test:e2e + Supabase Cloud migrations.
Vercel deployment for main branch works (prod), previews dla PR dostępne; Vercel Cron dla /api/admin/generate-signals nadal planowany „Po MVP”.

Database: PARTIAL (blisko pełnego MVP)
Schema and types OK (profiles, assets, strategies, signals) with RLS policies; XAUUSD asset seeded migracją 20251111_seed_core_data.sql.
Dodatkowe tabele pod forecast engine (price_history, price_forecasts, model_runs) zaimplementowane; plany/LLM (`plans`, `provider_config`, `llm_queries`, `citations`) nadal „Po MVP”.

API (Etap 1): OK (plus nowe endpointy forecast)
GET /api/health OK; /api/assets list + by id + admin CRUD implemented; GET /api/signals i POST /api/admin/generate-signals (mock strategy) działają.
Dodane endpointy forecast: GET /api/forecast/xauusd (publiczny baseline forecast), GET /api/admin/forecast/baseline-metrics oraz backend sync cen z Alpha Vantage (price history) na potrzeby modelu.

Source tool: manual check in Cursor using 10x-mvp-tracker guidelines

Next 5 quick wins
Domknąć E2E UI scenariusz CRUD assets admin (usunąć tymczasowy `skip` i ustabilizować test).
Dodać prosty endpoint GET /api/forecasts (lub rozszerzyć istniejący forecast/xauusd) zwracający historię prognoz na potrzeby UI overlay.
Zaplanować i udokumentować minimalny flow planów taryfowych (tabela plans + podstawowe endpointy /api/plans, /api/admin/assign-plan) jako krok w stronę Etapu 2.
Rozszerzyć observability dla forecast/news (spójne logi strukturalne, podstawowe metryki skuteczności w dashboardzie admina).
Przygotować i przetestować konfigurację Vercel Cron dla /api/admin/generate-signals / sync-price-history (bez włączania na produkcji do czasu finalnego scope’u Etapu 2).
```

### Historia raportów

| Data       | Ukończenie | Najważniejsze rekomendacje                                                                                     |
| ---------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| 2025-11-05 | ~35%       | README run guide; assets by id; seed XAUUSD/RLS; CI smoke; Playwright baseline                                 |
| 2025-11-29 | ~55%       | CI + Supabase Cloud migrations; Vercel deploy; assets CRUD over Supabase; env.cloud wiring                     |
| 2025-11-30 | ~65%       | Signals mock engine + dashboard list; GET /api/signals + POST /api/admin/generate-signals; Playwright E2E w CI |
| 2025-12-07 | ~75%       | Forecast engine + price history/price_forecasts/model_runs; Alpha Vantage news ingest; rozszerzone testy E2E   |

### Notatki i decyzje

- Krótkie zapiski z przeglądów, decyzje architektoniczne, zmiany zakresu.
