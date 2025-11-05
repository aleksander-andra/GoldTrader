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
Overall: ~35% complete

Documentation: PARTIAL
PRD in docs/PRD.md and docs/env.example present
README missing “How to start” + ENV/Deploy guide

Login (Auth): PARTIAL
Supabase client + middleware + login/register/logout pages OK
RBAC (user/admin) not implemented

Tests: PARTIAL
Smoke script exists and passes (npm run smoke)
Playwright E2E not added

Business Logic: TODO
Mock signals/top‑K/day, admin CRUD for assets not done

CI/CD: TODO
No GitHub Actions (lint/typecheck/build/e2e), no Vercel preview/prod

Database: PARTIAL
Schema and types OK (profiles, assets, strategies, signals)
RLS/seed (admin profile, XAUUSD) not finalized

API (Etap 1): PARTIAL
GET /api/health OK
/api/assets list OK; by id/CRUD admin, signals, generate-signals missing

Source tool: 10x-mvp-tracker guidelines https://github.com/przeprogramowani/10x-mvp-tracker

Next 5 quick wins
Add README “How to run locally” + ENV section; link smoke tests
Implement GET /api/assets/[id].ts and simple 404 handling
Seed XAUUSD + basic RLS confirmation; document how to apply migrations
Add GitHub Action: lint + build + smoke (curl health)
Add Playwright baseline test: opens /, /auth/login, /api/health returns 200
```

### Historia raportów

| Data | Ukończenie | Najważniejsze rekomendacje |
| ---- | ---------- | --------------------------- |
| 2025-11-05 | ~35% | README run guide; assets by id; seed XAUUSD/RLS; CI smoke; Playwright baseline |

### Notatki i decyzje

- Krótkie zapiski z przeglądów, decyzje architektoniczne, zmiany zakresu.


