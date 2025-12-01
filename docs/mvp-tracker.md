## 10x MVP Tracker — GoldTrader

Instrukcja użycia narzędzia: zobacz repozytorium 10x-mvp-tracker i uruchamiaj z poziomu Cursor: „Please report status of my project with check-mvp tool”.

Link: [GitHub – 10x-mvp-tracker](https://github.com/przeprogramowani/10x-mvp-tracker)

### Kryteria oceny (7)

- [ ] Dokumentacja
  - [ ] README uzupełnione o „Jak startujemy” i instrukcje ENV/Deploy
  - [x] PRD dostępny w `docs/PRD.md` (sekcja „MVP Scope (Etap 1)”)
  - [x] `docs/env.example` kompletne i aktualne

- [ ] Logowanie (Auth)
  - [x] Supabase skonfigurowany (URL/KEY, `supabase.client.ts`, middleware)
  - [x] UI logowanie/rejestracja/wylogowanie
  - [ ] RBAC (user/admin) — bez planów taryfowych w Etapie 1

- [ ] Testy
  - [ ] Playwright E2E: login ±, dashboard (chart + sygnały), CRUD assets (admin), generate‑signals
  - [ ] (opcjonalnie) testy kontraktowe API

- [ ] Logika biznesowa
  - [x] Mock silnik sygnałów + top‑K/dzień
  - [ ] Assets: CRUD (admin)
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

- [ ] Dashboard: wykres XAUUSD (pull) + lista sygnałów
- [ ] Assets (admin): lista + formularz (create/edit/delete)
- [ ] (Po MVP) Admin panel: providerzy/ plany; LLM czat; overlay forecast; SSE live

### Ostatni raport (wklej tutaj wynik z „check-mvp”)

```
10xDevs MVP status (check-mvp)
Overall: ~65% complete

Documentation: OK
PRD in docs/PRD.md; docs/env.example and docs/env.cloud.example present
README has "How to run locally" + ENV + deploy-to-Vercel/ENV.cloud section

Login (Auth): PARTIAL
Supabase Cloud configured; middleware + login/register/logout + reset hasła OK
RBAC (user/admin) działa w API (profiles.role), UI ról nadal minimalny

Tests: PARTIAL
Smoke script exists and passes (npm run smoke)
Playwright E2E baseline added (/, /auth/login, /api/health) i odpalany w CI

Business Logic: PARTIAL
Assets CRUD (admin) implemented over Supabase
Mock signals engine + POST /api/admin/generate-signals + dashboard list for XAUUSD gotowe

CI/CD: PARTIAL
GitHub Actions: lint + build + smoke + test:e2e + Supabase Cloud migrations
Vercel deployment for main branch works (prod), previews dla PR dostępne

Database: PARTIAL
Schema and types OK (profiles, assets, strategies, signals) with RLS policies
Migrations pushed to Supabase Cloud; seeding admin profile / plans still open

API (Etap 1): PARTIAL
GET /api/health OK
/api/assets list + by id + admin CRUD implemented
GET /api/signals i POST /api/admin/generate-signals (mock strategy) działają

Source tool: manual check in Cursor using 10x-mvp-tracker guidelines

Next 5 quick wins
Seed XAUUSD + admin user + e2e testy kont (E2E_USER/E2E_ADMIN) i potwierdzenie RLS
Proste UI Assets (admin): lista + formularz create/edit/delete
Rozszerzyć E2E o CRUD assets i generate-signals
Zrefaktoryzować dashboard (wydzielenie komponentów, przygotowanie pod wykres XAUUSD)
Przygotować szkic pod Vercel Cron /api/admin/generate-signals (bez włączania w MVP)
```

### Historia raportów

| Data       | Ukończenie | Najważniejsze rekomendacje                                                                                     |
| ---------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| 2025-11-05 | ~35%       | README run guide; assets by id; seed XAUUSD/RLS; CI smoke; Playwright baseline                                 |
| 2025-11-29 | ~55%       | CI + Supabase Cloud migrations; Vercel deploy; assets CRUD over Supabase; env.cloud wiring                     |
| 2025-11-30 | ~65%       | Signals mock engine + dashboard list; GET /api/signals + POST /api/admin/generate-signals; Playwright E2E w CI |

### Notatki i decyzje

- Krótkie zapiski z przeglądów, decyzje architektoniczne, zmiany zakresu.
