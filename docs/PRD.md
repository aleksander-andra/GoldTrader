# GoldTrader — PRD (pełny, szkielet)

## 1. Wizja, cel i zakres
<!-- cel biznesowy, cel zaliczeniowy, co poza MVP -->

## 2. Persony, role i uprawnienia (ACL)
<!-- admin/user, uprawnienia, JWT cookie -->

## 3. User Journeys (E2E flow)
<!-- UJ-1 Assets CRUD, UJ-2 Strategies CRUD, UJ-3 Signals (mock) -->

## 4. Wymagania funkcjonalne (moduły)
### 4.1 Auth
### 4.2 Assets
### 4.3 Strategies
### 4.4 Signals (mock)

## 5. Model danych (ERD ASCII + reguły Drizzle)
<!-- tabele users/assets/strategies/signals, klucze, unikalności -->

## 6. Kontrakt API (OpenAPI-like, przykłady)
<!-- Auth: POST /api/auth/login, GET /api/me; 
     Assets/Strategies CRUD; Signals (mock) -->

## 7. Reguły biznesowe i walidacje
<!-- regexy, unikalności, limity JSON, uprawnienia -->

## 8. Niefunkcjonalne (NFR)
<!-- wydajność, bezpieczeństwo, observability -->

## 9. Test Strategy (Playwright)
<!-- S1 assets, S2 strategies; artefakty CI -->

## 10. UI/UX (ekrany i stany)
<!-- /login, /assets, /strategies, (opcjonalnie) /assets/[symbol] -->

## 11. CI/CD, środowiska i sekrety
<!-- GitLab CI: build, e2e, image, deploy; CI variables -->

## 12. Bezpieczeństwo
<!-- JWT, cookies, walidacje, sekrety poza repo -->

## 13. Plan migracji / dane startowe
<!-- migracja 0001 + seed admin + przykładowe assets -->

## 14. Ryzyka i mitigacje
<!-- migracje, flaky E2E, sekrety -->

## 15. Roadmap (kamienie milowe)
<!-- Sprint 0..4 -->

## 16. DoR / DoD (checklisty)
<!-- Definition of Ready / Done -->
