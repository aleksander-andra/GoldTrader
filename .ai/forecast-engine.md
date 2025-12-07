Rola:
Jesteś seniorem ML / full-stack w projekcie „GoldTrader”. Projekt służy do analizy sygnałów (np. XAUUSD – złoto) i budowy modułów pod robota tradingowego. Masz pomóc zbudować SILNIK PROGNOZOWANIA CEN ASSETU, który później będzie podstawą dla robota tradingowego (BUY/SELL/HOLD).

Cel:
Chcę mieć backendowy silnik, który:

- zbiera historyczne dane cenowe (OHLCV) z darmowych źródeł,
- trenuje modele prognozowania krótkoterminowego ruchu ceny,
- pozwala w trybie „quasi real-time” generować prognozy dla najbliższego horyzontu (np. 5–60 minut / 1 dzień),
- zapisuje prognozy i ewaluacje w Supabase,
- udostępnia REST API / endpointy, z których może korzystać UI i moduł „robot trading”.

Możesz wykorzystać:

- XGBoost jako model bazowy (tablicowe featury),
- prostą sieć neuronową (np. MLP lub mały LSTM/GRU) jako drugi model do porównania,
- darmowe dane np. z Alpha Vantage (time series) – możesz użyć MCP `alphavantage` tylko do analizy API, ale produkcyjny kod ma używać normalnego REST API z kluczem z env.

Stack / założenia:

- Projekt GoldTrader ma backend w Node/TypeScript + Supabase (Postgres).
- Możesz zaproponować osobny serwis ML w Pythonie (FastAPI + xgboost/pytorch/keras/sklearn), ale architektura ma być prosta do uruchomienia (Docker, jeden kontener ML + obecny backend).
- Dane i prognozy trzymamy w Supabase.
- Użytkownik nie chce płacić za dane rynkowe – korzystamy z darmowych/starterowych planów (np. Alpha Vantage, inne free API) z rozsądnym limitem zapytań i cache.

Pracuj ETAPAMI – najpierw analiza i architektura, dopiero potem kod.

ETAP 1 – Analiza i architektura

1. Przejrzyj projekt (foldery, package.json, supabase) i krótko opisz:
   - gdzie najlepiej wpiąć warstwę „data & models”,
   - jaką formę przyjmie moduł ML:
     a) czysto Node/TS,
     b) osobny serwis Python (FastAPI),
     c) hybryda.
2. Zaproponuj architekturę w punktach (bez kodu), np.:
   - nowe tabele w Supabase: `price_history`, `price_forecasts`, `model_runs` itp.,
   - moduł do pobierania danych z Alpha Vantage (i ewentualnie innych źródeł),
   - moduł do inżynierii cech,
   - moduł do trenowania i zapisu modeli (XGBoost + NN),
   - API predykcji (endpointy),
   - prosty mechanizm schedulingu (cron/CLI/endpoint + GitHub Actions).
3. Najpierw zwróć mi tę propozycję architektury (w punktach, z nazwami plików i tabel), żeby można ją było zaakceptować. NIE pisz jeszcze pełnej implementacji.

ETAP 2 – Dane historyczne
Po akceptacji architektury:

1. Zaprojektuj tabele w Supabase, np.:
   - `price_history`:
     - id,
     - asset (np. "XAUUSD"),
     - timeframe (np. "1m", "5m", "1h", "1d"),
     - timestamp,
     - open, high, low, close, volume,
     - source (np. "alphavantage"),
     - created_at.
   - `price_forecasts`:
     - id,
     - asset,
     - timeframe,
     - forecast_horizon (np. 5m / 15m / 1h / 1d),
     - target_type (np. "return", "direction", "price_level"),
     - prediction_value,
     - prediction_direction (UP/DOWN/FLAT),
     - model_type (xgboost / nn),
     - model_version,
     - valid_from / valid_to,
     - created_at.
   - `model_runs`:
     - id,
     - model_type,
     - model_version,
     - asset,
     - train_start / train_end,
     - val_metric (np. accuracy, AUC, RMSE),
     - params (JSON),
     - created_at.
2. Zaimplementuj moduł pobierania danych z Alpha Vantage:
   - użyj normalnego REST API (nie MCP) w backendzie/serwisie ML,
   - konfiguracja via env:
     - `ALPHAVANTAGE_API_KEY`,
     - `ALPHAVANTAGE_BASE_URL`,
   - pobieraj time series dla XAUUSD (np. intraday + daily),
   - zapisuj dane do `price_history` z sanity checkiem (brak duplikatów, brak dziur tam gdzie to możliwe).
3. Przygotuj CLI/endpoint, który:
   - pobiera / aktualizuje dane historyczne dla zdefiniowanej listy assetów (na start XAUUSD),
   - jest przygotowany do podpięcia go pod cron (np. GH Actions).

ETAP 3 – Inżynieria cech (feature engineering)

1. Zaproponuj zestaw featurów dla modelu krótkoterminowego (np. prognoza ruchu w kolejnych 5–60 minutach / 1 dniu):
   - log-zwroty (returns),
   - rolling mean/volatility,
   - proste wskaźniki techniczne (SMA, EMA, RSI, MACD – ile ma sens),
   - zakodowanie „godzina dnia / dzień tygodnia”,
   - opcjonalnie zdarzenia z modułu `asset_events` (news / sentiment) jako featury.
2. Zaimplementuj w osobnym module funkcję, która:
   - bierze dane z `price_history`,
   - tworzy z nich pandas DataFrame (jeśli Python) lub strukturę w TS,
   - generuje featury,
   - generuje etykietę:
     - np. „direction_up” (1 jeśli cena za horyzont X wzrosła o więcej niż threshold, -1 jeśli spadła, 0 jeśli neutralna),
     - albo „future_return”.
3. Zadbaj o rozdział na train/validation/test w czasie (time-based split, NIE losowy).

ETAP 4 – Modele (XGBoost + sieć neuronowa)

1. Najpierw zaimplementuj model bazowy XGBoost:
   - klasyfikacja kierunku (UP/DOWN/NEUTRAL) albo regresja future_return (z późniejszym thresholdem),
   - cross-validation w stylu walk-forward / time-based,
   - zapisywanie metryk do `model_runs`,
   - zapis modelu (plik) + wersjonowanie (np. `model_type=xgboost`, `model_version=timestamp`).
2. Następnie prostą sieć neuronową:
   - na początek MLP na featurach tablicowych,
   - opcjonalnie LSTM/GRU na oknie historycznym, jeżeli stack i czas pozwolą,
   - również zapisywanie metryk i wersji do `model_runs`.
3. Porównaj wyniki:
   - accuracy / F1 / ROC-AUC dla klasyfikacji,
   - albo RMSE / MAE dla regresji,
   - zapisz wyniki i wskaż, który model jest domyślny do użycia w produkcji.

ETAP 5 – API predykcji (real-time / quasi real-time)

1. Zaimplementuj endpoint (np. w backendzie Node lub serwisie ML), typu:
   - `POST /api/forecast`:
     - body: `{ asset: "XAUUSD", timeframe: "5m", horizon: "30m" }`,
     - odp: `{ prediction_direction, prediction_value, model_type, model_version, valid_until }`.
2. Dla przepływu:
   - jeśli są świeże zapisane prognozy w `price_forecasts` (np. z ostatnich X minut) → zwróć je,
   - jeśli nie ma → na szybko:
     - dociągnij najnowszy kawałek danych,
     - wygeneruj featury,
     - załaduj najlepszy model,
     - oblicz prognozę,
     - zapisz do `price_forecasts`, zwróć wynik.
3. Dodaj prostą ochronę:
   - minimalna liczba punktów historycznych, poniżej której nie robimy prognozy,
   - zwracanie w UI jasnego komunikatu, że „model nie ma jeszcze danych”.

ETAP 6 – Integracja z robot trading (na razie „hooki”)

1. Zamiast od razu implementować pełnego bota tradingowego, przygotuj:
   - osobną funkcję/warstwę `tradingSignalEngine`, która:
     - na podstawie prognozy (XGBoost/NN) + aktualnej ceny,
     - generuje potencjalny sygnał „BUY/SELL/HOLD” z confidence,
     - stosuje proste reguły (np. minimalny próg confidence, minimalny oczekiwany ruch).
2. Zostaw TODO na przyszłość:
   - integracja z prawdziwym brokerem / API giełdy,
   - backtest na danych historycznych,
   - risk management.

ETAP 7 – Konfiguracja, budżet i monitoring

1. Wszystkie klucze/API i parametry w env:
   - `ALPHAVANTAGE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   - `FORECAST_DEFAULT_TIMEFRAME`, `FORECAST_DEFAULT_HORIZON`,
   - `ML_TRAINING_ENABLED`, `ML_FORECAST_ENABLED`.
2. Zadbaj o logi i proste metryki:
   - ile prognoz dziennie,
   - jakie metryki na walidacji,
   - ewentualnie prostą tabelę `forecast_evaluation`, gdzie można później porównać prognozy vs realne ceny.

Zacznij od ETAPU 1:

- opisz architekturę i plan: jakie tabele, jakie pliki/moduły, czy robimy osobny serwis ML w Pythonie, czy wszystko w Node/TS.
- poczekaj na moją akceptację zanim przejdziesz do implementacji.
