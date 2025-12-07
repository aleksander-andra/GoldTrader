Rola:
Jesteś seniorem full-stack w projekcie „GoldTrader”. Projekt służy do analizy sygnałów inwestycyjnych (np. złoto – XAUUSD) i budowy panelu dla traderów. Pracujesz w istniejącym kodzie (frontend + backend) i musisz dopasować się do aktualnej architektury.

Cel:
Chcę dodać do istniejącego dashboardu nowy panel (obok obecnych widoków: dashboard + sygnały). Panel ma składać się z dwóch części:

1. GÓRNA CZĘŚĆ – REKOMENDACJA BUY / SELL / HOLD:

- Na podstawie zindeksowanych informacji w projekcie (sygnały, wiadomości, dane historyczne, itp.) wylicz i wyświetl rekomendację dla danego assetu:
  - BUY (kup),
  - SELL (sprzedaj),
  - HOLD (trzymaj).
- Rekomendacja ma być obliczana po stronie serwera z użyciem OpenAI (mam dostęp do OpenAI API).
- Ważne: musimy OGRANICZYĆ KOSZTY API:
  - używaj raczej tańszych modeli,
  - obcinaj kontekst do tego, co naprawdę konieczne,
  - zrób prosty mechanizm cache’owania lub memoizacji (np. jeśli rekomendacja dla danego assetu była obliczona w ostatnich X minutach, używamy cache zamiast ponownego requestu).
- Chcę widzieć:
  - rekomendację (BUY/SELL/HOLD),
  - krótkie uzasadnienie (1–3 zdania),
  - np. prostą ocenę 0–100 „confidence”.

2. DOLNA CZĘŚĆ – LISTA WYDARZEŃ WPŁYWAJĄCYCH NA KURS:

- Wyświetl listę „kafelków” (kart), z których każda reprezentuje ważne wydarzenie wpływające na kurs wybranego assetu (np. złota):
  - wydarzenia polityczne,
  - wojny / konflikty,
  - decyzje FED / banków centralnych,
  - dane makroekonomiczne,
  - istotne newsy gospodarcze.
- Dla każdego wydarzenia potrzebuję:
  - obrazek:
    - może być generowany przez AI (placeholder) albo pobierany z internetu,
    - nie musi być bardzo zaawansowany – ważne, żeby wizualnie rozróżnić pozytywne/negatywne/neutralne wydarzenia,
  - tytuł wydarzenia,
  - krótki opis (1–3 zdania),
  - data / zakres dat,
  - ocena wpływu na kurs:
    - kierunek: pozytywny / negatywny / neutralny,
    - siła wpływu 1–10,
  - kolorystyka:
    - pozytywne – akcent „zielony”,
    - negatywne – akcent „czerwony”,
    - neutralne – np. szary/żółty.
- Źródła danych:
  - preferuję DARMOWY dostęp:
    - gotowe darmowe API / RSS,
    - ewentualnie prosty web scraping, ale tylko z sensownych, stabilnych źródeł (np. portale finansowe, newsy makro).
  - Zrób warstwę abstrakcji nad źródłami (np. interfejs „NewsProvider”), żeby łatwo było podmienić/rozszerzyć źródła.
  - Backend ma pobierać wydarzenia, obliczać sentyment i siłę wpływu, a frontend tylko je prezentuje.

Wymagania techniczne:

- Dopasuj się do aktualnego stacku projektu (sprawdź package.json, pliki konfiguracyjne i istniejące komponenty).
- Zaproponuj:
  - strukturę folderów i plików dla nowego panelu,
  - podział na komponenty (górna rekomendacja / dolna lista wydarzeń),
  - warstwę backendową/API (endpointy do pobierania rekomendacji i wydarzeń).
- Zadbaj o czytelny kod:
  - typy (np. TypeScript),
  - osobne modele typu `EventImpact`, `RecommendationResult` itp.,
  - czytelne nazwy funkcji i komponentów,
  - TODO-komentarze tam, gdzie trzeba dopiąć konfiguracje (np. klucze do zewnętrznych API).

Budżet i koszty:

- Dla OpenAI:
  - używaj modeli o niższym koszcie, jeśli nie ma silnej potrzeby użycia „top” modelu,
  - ograniczaj długość promptów,
  - dodaj prostą konfigurację w env (np. `OPENAI_MAX_TOKENS_PER_CALL`, `OPENAI_MODEL`), żeby można było łatwo regulować koszty.
- Przy pobieraniu newsów:
  - preferuj darmowe i niewymagające kart kredytowych źródła,
  - tam gdzie trzeba klucza API – załóż, że będzie on trzymany w zmiennych środowiskowych (np. `NEWS_API_KEY`).

Twoje zadania (workflow):

1. Przeanalizuj istniejący kod projektu (frontend + backend) i krótko opisz, gdzie najlepiej wpiąć nowy panel (który layout / strona / komponent).
2. Zaproponuj architekturę modułu:
   - jakie nowe pliki/komponenty/endpointy utworzymy,
   - jak będzie wyglądał przepływ danych (od zewnętrznych źródeł + OpenAI → backend → frontend).
3. Zaproponuj i zaimplementuj minimalną wersję UI:
   - panel obok dashboardu i sygnałów,
   - górna część z rekomendacją (z mockiem danych, jeśli trzeba),
   - dolna lista wydarzeń w formie kart (też na początku może być mock danych).
4. Następnie podłącz realne źródła danych:
   - backendowa logika do pobierania newsów,
   - logika do wyznaczania sentymentu i siły wpływu (może być prosta heurystyka + OpenAI).
5. Dodaj podstawowe testy (np. jednostkowe dla logiki klasyfikacji wydarzeń i rekomendacji).
6. Na koniec wypisz checklistę rzeczy do konfiguracji (env, klucze API, ograniczenia kosztów), które trzeba ustawić, żeby moduł działał w CI/CD i na produkcji.

Zanim zaczniesz pisać kod:

- Najpierw pokaż mi propozycję architektury (lista plików/komponentów/endpointów + krótki opis), żebym mógł ją zaakceptować lub skomentować.
