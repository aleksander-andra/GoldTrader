/label ~"type::story" ~"status::needs-refinement" ~"agent::pm" ~"area::assets"

## Tytuł
[STORY] Użytkownik dodaje nowe aktywo (Assets CRUD – create)

## User Story
Jako zalogowany użytkownik chcę dodać aktywo do listy (symbol, nazwa, typ),
aby móc później generować sygnały i backtesty dla wybranych instrumentów.

## Kontekst / Założenia
- Auth: JWT w cookie HttpOnly (endpoint `POST /api/auth/login`).
- DB: Drizzle (SQLite dev), tabela `assets(id, symbol, name, type)`.
- Unikalność `symbol` globalnie.
- Typ: `commodity|stock|crypto` (na start 3 wartości).

## Flow / Makieta
1) Wejście na stronę „Assets”.
2) Klik „Dodaj aktywo”.
3) Formularz: `symbol`, `name`, `type` (+ walidacje live).
4) Zapis → wracam do listy, widzę rekord.
5) Błędy (np. duplikat symbolu) pokazane inline.

## Dane / Walidacje
- symbol: wymagany, 1–8 znaków, A–Z/0–9/„-”, unikalny.
- name: wymagany, 3–40 znaków.
- type: wymagany, jeden z: commodity/stock/crypto.

## Kryteria Akceptacji (AC)
- [ ] AC1: API `POST /api/assets` zwraca 201 z nowym rekordem (JSON), a duplikat symbolu → 409.
- [ ] AC2: UI waliduje pola i wyświetla błąd duplikatu bez przeładowania.
- [ ] AC3: Po zapisie rekord widoczny w tabeli bez odświeżania strony.
- [ ] AC4: E2E: login → create (GOLD, „Złoto”, commodity) → w liście widzę „GOLD”.

## Definition of Ready (DoR)
- [x] Persona: zalogowany user
- [x] AC wpisane i mierzalne
- [x] Zależności: auth + tabela `assets` gotowe
- [ ] Edge cases: symbol w małych literach? (do decyzji: normalizujemy do UPPERCASE)

## Zależności
- Migracja `assets` w Drizzle.
- Middleware auth (sprawdzenie JWT).

## Out of Scope
- Edycja/Usuwanie (oddzielne stories).
- Integracja z ML.

## Uwagi dla agenta/zespołu
- Po wdrożeniu proszę Testera o E2E (login→create).
