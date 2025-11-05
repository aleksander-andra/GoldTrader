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
(wklej zawartość raportu 10x-mvp-tracker)
```

### Historia raportów

| Data | Ukończenie | Najważniejsze rekomendacje |
| ---- | ---------- | --------------------------- |
|      |            |                             |

### Notatki i decyzje

- Krótkie zapiski z przeglądów, decyzje architektoniczne, zmiany zakresu.


