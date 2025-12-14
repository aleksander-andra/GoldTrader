## GoldTrader – opis systemu dla LLM

### Cel systemu

**GoldTrader** to webowa aplikacja inwestycyjna z sygnałami tradingowymi dla XAUUSD (złoto), z panelem użytkownika i panelem administratora.  
System umożliwia:

- generowanie sygnałów tradingowych (kandydatów),
- ich przegląd, akceptację/odrzucanie przez admina,
- prezentację zaakceptowanych i aktualnie ważnych sygnałów użytkownikom końcowym,
- monitorowanie jakości prostego modelu bazowego (baseline).

---

## Stos technologiczny i architektura

### Frontend

- **Astro 5**
- **React 19**
- **TypeScript 5**
- **Tailwind CSS 4**
- **shadcn/ui**

Główne komponenty:

- `SignalsDashboardClient` – dashboard sygnałów dla użytkownika,
- `BaselineForecastCard` – karta z metrykami jakości modelu bazowego,
- `ForecastHistoryChart` – wykres historycznych prognoz,
- `AdminSignalsClient` – panel admina do generowania i zarządzania sygnałami,
- `AuthNavClient` – nawigacja z informacją o roli (badge „admin”).

### Backend i dane

- **Supabase** (PostgreSQL + Auth + RBAC)
- Autoryzacja: Supabase Auth (JWT/bearer w przeglądarce)
- Role użytkowników:
  - `user` – zwykły użytkownik,
  - `admin` – admin (dostęp do `/api/admin/**`).

Najważniejsze tabele:

- `assets`
  - Aktywa (np. `XAUUSD`).
  - Kolumna kluczowa: `symbol`.

- `price_history`
  - Dzienne świece OHLCV dla aktywów.
  - Wykorzystywane do:
    - wykresów cen,
    - feature engineering i baseline’u.

- `asset_events`
  - Newsy / wydarzenia dotyczące aktywów.
  - Dane z zewnętrznych źródeł (np. Alpha Vantage / NewsAPI).

- `price_forecasts`
  - Prognozy generowane przez model(s).
  - Zasilają m.in. `ForecastHistoryChart`.

- `model_runs`
  - Metadane o uruchomieniach modelu i wynikach backtestów (trafność itp.).

- `strategies`
  - Definicje strategii tradingowych.
  - Sygnał ma `strategy_id`, a UI pokazuje `strategies.name` i `strategies.type`.

- `signals`
  - Kluczowa tabela z sygnałami.
  - Pola istotne biznesowo:
    - `asset_id`
    - `strategy_id`
    - `type` – `BUY` | `SELL` | `HOLD`
    - `confidence` – liczba 0–100 (procent pewności)
    - `status` – `candidate` | `accepted` | `rejected` | `expired`
    - `valid_from` – od kiedy sygnał jest ważny
    - `valid_to` – do kiedy sygnał jest ważny
    - `forecast_price` – cena prognozowana w momencie generowania
    - `realized_price` – cena zrealizowana po zakończeniu ważności
    - `realized_direction` – faktyczny kierunek rynku
    - `hit` – informacja, czy prognoza była poprawna (true/false).

---

## Model bazowy i backtest

### Baseline forecast (silnik prognoz)

- Prosty, deterministyczny model kierunkowy dla XAUUSD (UP/DOWN/FLAT).
- Pracuje na **dziennych** danych z `price_history`.
- Feature engineering obejmuje m.in.:
  - log-returny,
  - średnie kroczące (SMA),
  - zmienność,
  - kontekst newsów (`asset_events`).

Wyniki:

- Kierunek (`UP`/`DOWN`/`FLAT`) + `confidence` (0–100).
- Dane zasilają:
  - endpoint `GET /api/forecast/xauusd`,
  - tabelę `price_forecasts`,
  - backtest w `baselineBacktest`.

### Backtest baseline’u

- Określa trafność kierunku w oknie np. 90 dni.
- Funkcja (np. `computeBaselineAccuracy`) liczy:
  - `windowDays` – rozmiar okna,
  - `totalSamples` – liczba obserwacji,
  - `correct` – ile razy kierunek był trafiony,
  - `accuracy` – procent (0–100%).
- Endpoint:
  - `GET /api/admin/forecast/baseline-metrics`
  - UI: `BaselineForecastCard`.

---

## API – przegląd

### Endpoints użytkownika (wymagana autoryzacja)

- **`GET /api/signals?symbol=XAUUSD`**
  - Wymaga nagłówka `Authorization: Bearer <token>`.
  - Zwraca **tylko** sygnały:
    - `status = 'accepted'`
    - `valid_to > now()`
  - Dane zwracane są jako lista obiektów sygnałów (`items`).
  - Używane przez komponent `SignalsDashboardClient`.

- **`GET /api/forecast/xauusd`**
  - Zwraca aktualną prognozę baseline:
    - kierunek,
    - confidence,
    - timestamp.
  - W trybie awaryjnym (brak credentials serwisowych) może zwrócić neutralny forecast (FLAT, 0%).

- **`GET /api/prices?symbol=XAUUSD&range=1d` (i inne zakresy)**
  - Zwraca świece cenowe do wykresu:
    - timestamp,
    - open, high, low, close, volume.

### Endpoints admina (RBAC: `role = 'admin'`)

#### Forecast / jakość modelu

- **`POST /api/admin/forecast/run-baseline`**
  - Ręczne wywołanie modelu baseline.
  - Zapisuje wyniki do bazy (`price_forecasts`, `model_runs`).

- **`GET /api/admin/forecast/baseline-metrics`**
  - Zwraca metryki backtestu baseline’u (okno, accuracy itd.).

#### Zarządzanie sygnałami

- **`POST /api/admin/generate-signals`**
  - Generuje nowe sygnały (obecnie jeden sygnał per wywołanie).
  - Parametry (body, np. JSON):
    - `assetSymbol` (np. `XAUUSD`),
    - `strategyId`,
    - `validForMinutes` – jak długo sygnał ma być ważny,
    - `lookbackMinutes` – jak daleką historię brać pod uwagę,
    - `validFromOffsetMinutes`, `validToOffsetMinutes` – przesunięcia względem `now()`.

- **`POST /api/admin/signals/refresh-and-generate`**
  - Pipeline: odśwież newsy → wygeneruj sygnał o podanych parametrach.

- **`GET /api/admin/signals/candidates?assetSymbol=XAUUSD`**
  - Zwraca listę sygnałów o `status = 'candidate'`.
  - Dołączone pola strategii:
    - `strategies.name`,
    - `strategies.type`.
  - Używane w `AdminSignalsClient` (tabela kandydatów).

- **`POST /api/admin/signals/accept`**
  - Body: `{ id: <signalId> }`.
  - Jeśli sygnał istnieje i ma `status='candidate'` → ustawia `status='accepted'`.
  - Jeśli nie (brak, inny status) → zwraca 404 z komunikatem `Signal not found or not a candidate`.

- **`POST /api/admin/signals/reject`**
  - Analogicznie, ale ustawia `status='rejected'`.

#### Dane wejściowe: ceny i newsy

- **`POST /api/admin/price-history/sync`**
  - Ręczny sync historii cen dla zadanego aktywa (`assetSymbol`).
  - Wewnątrz używa serwisu `syncDailyPriceHistoryForAsset`.

- **Endpoints cronowe (wywoływane przez Vercel Cron)**
  - `POST /api/admin/cron/sync-price-history`
  - `POST /api/admin/cron/generate-signals`
  - `POST /api/admin/cron/sync-all-assets-price-history`
  - Ich zadaniem jest automatyczne odświeżanie cen i generowanie sygnałów wg harmonogramu.

---

## Logika sygnałów – cykl życia

1. **Generowanie – status `candidate`**
   - Admin w panelu (`/admin/signals`) uzupełnia formularz:
     - aktywo,
     - strategia,
     - „Od (data/czas)”, „Do (data/czas)” – przekładane na `valid_from` / `valid_to`,
     - `lookbackMinutes`.
   - Backend (np. `generationService.ts`):
     - oblicza featury,
     - pobiera ostatnią cenę (ustawia `forecast_price`),
     - wyznacza kierunek i `confidence` (baseline / strategia),
     - tworzy rekord w `signals` z:
       - `status = 'candidate'`,
       - `valid_from`, `valid_to`,
       - `forecast_price`, `type`, `confidence`, `strategy_id`, `asset_id`.

2. **Panel admina – przegląd kandydatów**
   - `AdminSignalsClient` pobiera `GET /api/admin/signals/candidates`.
   - W tabeli admin widzi:
     - przedział ważności (od–do),
     - aktywo,
     - kierunek (BUY/SELL/HOLD),
     - nazwę i typ strategii,
     - `confidence` (pewność),
     - przyciski:
       - „Akceptuj” (accept),
       - „Odrzuć” (reject).

3. **Akceptacja / odrzucanie**
   - „Akceptuj” → `POST /api/admin/signals/accept`:
     - jeśli sygnał jest nadal kandydatem, status zmienia się na `accepted`.
     - przy kolejnym kliknięciu (lub gdy sygnał nie jest kandydatem) endpoint zwraca 404 (to spodziewane).
   - „Odrzuć” → `POST /api/admin/signals/reject` → `status='rejected'`.

4. **Widoczność dla użytkownika końcowego**
   - Użytkownik na dashboardzie (`SignalsDashboardClient`):
     - pobiera sygnały przez Supabase klienta (lub przez publiczny endpoint),
     - widzi tylko sygnały:
       - `status='accepted'`,
       - `valid_to > now()`.
   - Tabela użytkownika zawiera m.in.:
     - kolumnę „Ważny (UTC)”:
       - główna linia: `valid_from` w formacie `YYYY-MM-DD HH:MM:SS UTC`,
       - linia pomocnicza: `do HH:MM UTC` (z `valid_to`),
     - typ sygnału z kolorowym badge (BUY/SELL/HOLD),
     - `confidence` (%), wyrównane do prawej,
     - nazwę strategii.

5. **Po wygaśnięciu – ocena (`expired` / `hit`)**
   - Gdy `now() > valid_to`, sygnał przestaje być „aktywny”.
   - Osobna logika (cron / batch) może:
     - pobrać cenę realizacji (`realized_price`),
     - określić faktyczny kierunek (`realized_direction`),
     - ustawić `hit` = true/false.
   - Dane można używać do statystyk skuteczności strategii i raportów.

---

## Widoki w UI

### Dashboard użytkownika (React)

- Komponent: `SignalsDashboardClient`.
- Sekcje:
  - Wykres XAUUSD (`XauusdChartClient`) – dane z `/api/prices`.
  - Ekstrapolowana prognoza na wykresie (prosty trend z ostatnich punktów).
  - Karta baseline’u (`BaselineForecastCard`) – trafność z `baseline-metrics`.
  - Wykres historii prognoz (`ForecastHistoryChart`) – dane z `price_forecasts`.
  - Tabela „Ostatnie sygnały XAUUSD”:
    - aktywne (zaakceptowane i ważne),
    - czas ważności (od–do),
    - kierunek,
    - confidence,
    - strategia.

### Panel admina sygnałów

- Strona: `/admin/signals`.
- Komponent: `AdminSignalsClient`.
- Funkcje:
  - Formularz generowania sygnałów:
    - wybór aktywa,
    - wybór strategii,
    - pola:
      - „Od (data/czas)” – domyślnie teraz,
      - „Do (data/czas)” – domyślnie teraz + 60 min,
      - „Okno historii (min)”,
    - przyciski akcji:
      - „Generuj sygnały” (tylko generacja),
      - „Odśwież newsy + generuj” (sync news + generacja),
      - „Aktualizuj historię ceny” (sync price history danego aktywa).
  - Tabela kandydatów na sygnały:
    - kolumny: czas (od–do), asset, kierunek, strategia, confidence, akcje,
    - przyciski: „Akceptuj”, „Odrzuć” (odpowiednie admin endpoints).

### Nawigacja i role

- `AuthNavClient`:
  - pokazuje linki logowania/rejestracji,
  - pokazuje „admin” badge przy linku „Profil” dla roli `admin`.

---

## Jakiego chatbota można na tym zbudować?

Ten opis pozwala innemu LLM:

- zrozumieć **domenę** (sygnały tradingowe, ważność od–do, confidence, strategie),
- zrozumieć **role** (user/admin) i jakie operacje są dostępne dla kogo,
- znać **główne encje** (`signals`, `assets`, `price_history`, `model_runs`, `strategies`, `asset_events`),
- znać **kluczowe procesy biznesowe**:
  - generowanie kandydatów,
  - akceptacja/odrzucanie,
  - widoczność sygnałów,
  - estymacja skuteczności (baseline accuracy, hit rate),
- znać **API**, żeby chatbot mógł np.:
  - tłumaczyć odpowiedzi z endpointów,
  - podpowiadać adminowi jakie kroki wykonać,
  - wyjaśniać użytkownikom znaczenie sygnałów (kiedy ważny, jaka strategia, jaka pewność).

Na tej podstawie można napisać prompt typu:  
„Jesteś asystentem systemu GoldTrader opisanym poniżej. Twoim zadaniem jest wyjaśnianie użytkownikom, co oznaczają sygnały tradingowe, jak działa cykl życia sygnału (candidate → accepted/rejected → expired), jakie są role użytkownika i admina oraz jak interpretować parametry takie jak ważność od–do i confidence…”
