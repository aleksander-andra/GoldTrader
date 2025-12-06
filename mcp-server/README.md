# GoldTrader MCP Server

Model Context Protocol (MCP) server rozszerzający możliwości AI o integrację z danymi finansowymi.

## Funkcjonalności

### 🏆 Narzędzia dostępne dla AI:

#### 1. `get_gold_price`

Pobiera aktualne ceny złota i metali szlachetnych.

**Parametry:**

- `symbol` (string, opcjonalny): Symbol metalu (np. "XAUUSD", "XAUEUR") - domyślnie "XAUUSD"
- `timeframe` (string, opcjonalny): Okres ("1D", "1W", "1M") - domyślnie "1D"

**Przykład użycia przez AI:**

```
Użytkownik: "Jaka jest aktualna cena złota?"
AI: [wywołuje get_gold_price] -> Zwraca dane cenowe w JSON
```

#### 2. `search_financial_news`

Wyszukuje najnowsze wiadomości finansowe.

**Parametry:**

- `query` (string, wymagany): Zapytanie do wyszukania
- `limit` (number, opcjonalny): Maksymalna liczba wyników (1-10) - domyślnie 5

**Przykład użycia przez AI:**

```
Użytkownik: "Jakie są najnowsze wiadomości o rynku złota?"
AI: [wywołuje search_financial_news z query="złoto"] -> Zwraca listę wiadomości
```

## Jak uruchomić

### 1. Zainstaluj zależności

```bash
cd mcp-server
npm install
```

### 2. Zbuduj projekt

```bash
npm run build
```

### 3. Testuj z MCP Inspector

```bash
npm run test
```

### 4. Uruchom serwer

```bash
npm start
```

## Architektura

```
mcp-server/
├── src/
│   ├── index.ts          # Główny serwer MCP
│   ├── tools/            # Definicje narzędzi (przyszłość)
│   └── data/             # Dostawcy danych (przyszłość)
├── package.json
├── tsconfig.json
└── README.md
```

## Schematy Zod

Wszystkie dane wejściowe i wyjściowe są walidowane przy użyciu Zod:

```typescript
const GetGoldPriceSchema = z.object({
  symbol: z.string().default("XAUUSD"),
  timeframe: z.enum(["1D", "1W", "1M"]).default("1D"),
});
```

## Rozszerzenia

### Możliwe przyszłe narzędzia:

- Integracja z prawdziwymi API finansowymi (Alpha Vantage, Yahoo Finance)
- Analiza techniczna (RSI, MACD, wskaźniki)
- Alerting cenowy
- Portfel inwestycyjny
- Analiza ryzyka

### Integracja z bazami danych:

- Supabase dla przechowywania danych historycznych
- Cache Redis dla szybkiego dostępu
- Time-series database dla danych cenowych

## Bezpieczeństwo

- Wszystkie dane wejściowe walidowane przez Zod
- Bezpieczna obsługa błędów
- Brak wrażliwych danych w logach
- Przygotowany do integracji z API keys (przez zmienne środowiskowe)

## Testowanie

```bash
# Testy jednostkowe
npm test

# MCP Inspector dla testów integracyjnych
npx @modelcontextprotocol/inspector@latest
```

## Przykład rozmowy z AI

```
Użytkownik: "Sprawdź cenę złota i znajdź najnowsze wiadomości"

AI: Najpierw sprawdzę aktualną cenę złota...
[wywołuje get_gold_price z domyślnymi parametrami]

Cena złota (XAUUSD): $2,045.67 (+0.23%)

Teraz poszukam najnowszych wiadomości...
[wywołuje search_financial_news z query="gold price news"]

Znaleziono 3 najnowsze wiadomości:
1. "Gold prices surge amid economic uncertainty"
2. "Federal Reserve signals potential rate cuts"
3. "Gold ETF sees record inflows this week"
```
