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
  - [ ] Mock silnik sygnałów + top‑K/dzień
  - [ ] Assets: CRUD (admin)
  - [ ] (Po MVP) Adapter providerów danych i forecasts

- [ ] CI/CD
  - [ ] GitHub Actions: lint, typecheck, test:e2e, build
  - [ ] Vercel: Preview dla PR, produkcja na main
  - [ ] (Po MVP) Vercel Cron: `/api/admin/generate-signals`

- [ ] Baza danych
  - [x] Schemat w Supabase: `profiles`, `assets`, `strategies`, `signals`
  - [ ] RLS i seed (admin profil, XAUUSD)
  - [x] `src/db/database.types.ts` wygenerowany
  - [ ] (Po MVP) `plans`, `provider_config`, `forecasts`, `llm_queries`, `citations`

- [ ] API (Etap 1 minimalny)
  - [x] `GET /api/health`
  - [ ] `GET /api/assets`, `POST/PATCH/DELETE /api/assets` (admin)
  - [ ] `GET /api/signals`
  - [ ] `POST /api/admin/generate-signals`
  - [ ] (Po MVP) `GET/PUT /api/profile`, `GET /api/plans`, `GET/POST /api/admin/providers`
  - [ ] (Po MVP) `GET /api/prices`, SSE (`/api/stream/*`), `GET /api/forecasts`, LLM endpoints

### Widoki (dla szybkiego przeglądu postępu UI)

- [ ] Dashboard: wykres XAUUSD (pull) + lista sygnałów
- [ ] Assets (admin): lista + formularz (create/edit/delete)
- [ ] (Po MVP) Admin panel: providerzy/ plany; LLM czat; overlay forecast; SSE live

### Ostatni raport (wklej tutaj wynik z „check-mvp”)

```
10xDevs MVP status (check-mvp)
Overall: ~55% complete

Documentation: OK
PRD in docs/PRD.md; docs/env.example and docs/env.cloud.example present
README has "How to run locally" + ENV; deploy-to-Vercel still not documented

Login (Auth): PARTIAL
Supabase Cloud configured; middleware + login/register/logout pages OK
RBAC (user/admin) wiring in API, but roles/plans in UI still minimal

Tests: PARTIAL
Smoke script exists and passes (npm run smoke)
Playwright E2E not added yet

Business Logic: PARTIAL
Assets CRUD (admin) implemented over Supabase; signals/mock strategy still TODO

CI/CD: PARTIAL
GitHub Actions present: lint + build + smoke + Supabase Cloud migrations
Vercel deployment for main branch works; no Vercel Cron yet

Database: PARTIAL
Schema and types OK (profiles, assets, strategies, signals) with RLS policies
Migrations pushed to Supabase Cloud; seeding admin profile / plans still open

API (Etap 1): PARTIAL
GET /api/health OK
/api/assets list + by id + admin CRUD implemented; signals + generate-signals missing

Source tool: manual check in Cursor using 10x-mvp-tracker guidelines

Next 5 quick wins
Document deploy-to-Vercel and ENV.cloud in README
Implement GET /api/signals and simple list view on dashboard
Seed XAUUSD + admin user in Supabase (SQL or migration) and confirm RLS
Add GitHub Action step for Playwright baseline test (/, /auth/login, /api/health)
Start mock signals engine + POST /api/admin/generate-signals (no SSE yet)
```

### Historia raportów

| Data       | Ukończenie | Najważniejsze rekomendacje                                                                 |
| ---------- | ---------- | ------------------------------------------------------------------------------------------ |
| 2025-11-05 | ~35%       | README run guide; assets by id; seed XAUUSD/RLS; CI smoke; Playwright baseline             |
| 2025-11-29 | ~55%       | CI + Supabase Cloud migrations; Vercel deploy; assets CRUD over Supabase; env.cloud wiring |

### Notatki i decyzje

- Krótkie zapiski z przeglądów, decyzje architektoniczne, zmiany zakresu.
