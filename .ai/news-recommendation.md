Kontekst:
W projekcie GoldTrader mam już UI panelu z AI REKOMENDACJĄ oraz listą „WYDARZENIA WPŁYWAJĄCE NA KURS”. Obecnie dane w tej liście oraz w rekomendacji są MOCKAMI.

Chcę przejść z mocków na PRAWDZIWE dane z zewnętrznych źródeł, z oceną wpływu wydarzeń na kurs (np. złota – XAUUSD) i na tej podstawie generować rekomendację BUY/SELL/HOLD.

Twoja rola:
Jesteś seniorem full-stack w tym projekcie. Znajdź istniejący kod panelu (komponent AI rekomendacji + lista wydarzeń) i krok po kroku:

- zaprojektuj architekturę,
- podłącz prawdziwe źródła newsów,
- zbuduj scoring + modele danych,
- zintegruj to z modułem AI REKOMENDACJI, z uwzględnieniem limitów budżetu OpenAI.

Stack:
Dopasuj się do stacku wykrytego w projekcie (Astro/React/Tailwind + Supabase, backend w Node/TypeScript). Nie zmieniaj technologii, tylko rozbuduj istniejące miejsce w kodzie.

Wymagania funkcjonalne:

1. Prawdziwe newsy zamiast mocków

- Znajdź miejsca, gdzie aktualnie generowane są MOCK dane dla:
  - listy wydarzeń,
  - AI rekomendacji.
- Zaprojektuj warstwę „news engine”, która pobiera informacje z MINIMUM 2 niezależnych źródeł:
  - mogą to być darmowe API finansowe, RSS znanych serwisów, albo prosty web-scraping,
  - preferuj darmowe / bezkredytówkowe źródła; wszystkie klucze API mają być brane z env (np. NEWS_API_KEY_X).
- Zrób abstrakcję:
  - interfejs typu `NewsSource` z metodą `fetchEventsForAsset(asset: string): Promise<AssetEvent[]>`,
  - implementacje dla konkretnych źródeł (`NewsApiSource`, `RssSource`, itp.),
  - serwis `NewsAggregator` łączący wyniki z wielu źródeł.

2. Model danych dla wydarzeń
   Zaproponuj i zaimplementuj wspólny model, np.:

- `AssetEvent`:
  - id
  - asset (np. "XAUUSD")
  - title
  - summary / description
  - published_at
  - source_name
  - source_url
  - direction: "POS" | "NEG" | "NEU"
  - impact_score: number (1–10)
  - source_score: number (0–1) – ocena wiarygodności źródła
  - final_score: number (np. 0–100) – do sortowania w UI

Dane zapisz w Supabase (tabela `asset_events` lub podobna). Zaimplementuj prosty serwis/cron odświeżający wydarzenia co X minut, żeby UI nie robił ciężkich requestów za każdym razem.

3. Scoring wiarygodności źródeł i wpływu

- Zaimplementuj podstawowy scoring:
  - `source_score` – baza 0–1 per źródło (np. ręcznie ustawione w kodzie lub w tabeli `news_sources`).
  - `sentiment_score` i `direction`:
    - możesz użyć prostego LLM-a (np. tańszy model OpenAI) do klasyfikacji tytułu + opisu na POS/NEG/NEU + siła 1–10,
    - albo na początek proste heurystyki (słowa kluczowe).
  - `final_score`:
    - połączenie: source_score, sentiment_score, świeżość (degraduj bardzo stare newsy).
- Przygotuj strukturę pod przyszły „feedback loop”:
  - dodaj miejsce (np. kolumny `prediction_direction`, `observed_direction`, `source_reliability_score`), żeby w przyszłości dało się porównywać, czy prognoza była zgodna z tym, co stało się z ceną,
  - na razie możesz zapełnić to TODO-komentarzami i prostymi polami w modelu.

4. AI REKOMENDACJA na podstawie realnych wydarzeń

- Zamiast mocków, zbuduj serwis `AiRecommendationService`, który:
  - pobiera z bazy ostatnie N wydarzeń dla danego assetu (posortowane po `final_score` + recency),
  - opcjonalnie pobiera też najnowsze dane price/technical (jeśli są w projekcie),
  - składa z tego zwięzły kontekst dla OpenAI.
- Zdefiniuj prompt systemowy i userowy dla OpenAI tak, aby model:
  - analizował listę `AssetEvent`,
  - zwracał w JSON:
    - `decision`: "BUY" | "SELL" | "HOLD",
    - `confidence`: 0–100,
    - `rationale`: krótkie wyjaśnienie po polsku (2–4 zdania),
  - UX ma wyglądać podobnie jak teraz (przycisk HOLD/BUY/SELL, confidence bar).
- Dodaj prosty caching:
  - jeśli rekomendacja dla danego assetu była liczona w ostatnich X minutach, użyj cache zamiast kolejnego wywołania OpenAI.
  - ustaw konfigurację w env:
    - `OPENAI_MODEL`,
    - `OPENAI_MAX_TOKENS`,
    - `OPENAI_RECOMMENDATION_TTL_MINUTES`.

5. Ograniczenie budżetu / kosztów OpenAI

- Używaj raczej tańszych modeli (np. gpt-4o-mini/5.1-mini – dopasuj do tego, co jest w projekcie).
- Przygotuj mechanizm, który:
  - ogranicza liczbę wydarzeń przekazywanych do modelu (np. top 5–10 po final_score),
  - ucina zbyt długie opisy,
  - umożliwia wyłączenie rekomendacji AI flagą w env (np. `AI_RECOMMENDATION_ENABLED=false`).

6. Integracja z istniejącym UI

- Znajdź komponent odpowiadający za:
  - kafelek AI REKOMENDACJI,
  - listę „Wydarzenia wpływające na kurs”.
- Usuń mocki i podłącz dane z nowych endpointów/backendu:
  - jeśli backend nie zwróci danych → pokaż sensowny stan pusty (np. „Brak aktualnych wydarzeń dla tego assetu”),
  - jeśli AI jest wyłączone (brak klucza OpenAI / env), pokaż informację „Rekomendacja AI jest wyłączona (brak konfiguracji)”.

7. Etapy pracy
   Proszę, żebyś pracował etapami:

1) Najpierw przeanalizuj kod i wypisz mi:
   - gdzie są mocki,
   - gdzie najlepiej wpiąć nowe serwisy (foldery, pliki),
   - draft architektury: lista nowych plików + odpowiedzialności.
2) Po akceptacji architektury:
   - zaimplementuj model danych + serwisy backendowe (news sources, aggregator, recommendation service),
   - dodaj podstawowe testy jednostkowe dla logiki scoringu.
3) Na końcu:
   - podłącz nowe API do UI,
   - usuń mocki,
   - opisz w README/env.example, jakie zmienne środowiskowe trzeba ustawić (NEWS*API*_ oraz OPENAI\__).

Zacznij od kroku 1: proszę o krótkie podsumowanie obecnej implementacji panelu z mockami i propozycję architektury (w punktach). Nie pisz od razu całego kodu.
