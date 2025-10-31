# GoldTrader DB Plan — MVP Etap 1

Zakres dotyczy Etapu 1 (zgodnie z 10xDevs): Auth (Supabase), Assets (CRUD admin), Strategies (mock), Signals (top‑K/dzień), minimalne API i E2E. Poza zakresem (Etap 2+): SSE, LLM, plany taryfowe, forecasts, rozbudowany provider_config.

## 1. Tabele

### 1.1 profiles
- user_id uuid PK (FK -> auth.users.id)
- role text NOT NULL CHECK (role IN ('admin','user')) DEFAULT 'user'
- created_at timestamptz NOT NULL DEFAULT now()

Uwagi:
- Brak własnej tabeli `users`; tożsamość zapewnia `auth.users` (Supabase Auth).
- Jeden‑do‑jeden z `auth.users`.

### 1.2 assets
- id uuid PK DEFAULT gen_random_uuid()
- symbol text NOT NULL UNIQUE -- 'XAUUSD'
- name text NOT NULL -- 'Gold'
- currency text NOT NULL -- 'USD'
- created_at timestamptz NOT NULL DEFAULT now()

Uwagi:
- W Etapie 1 jedno aktywo referencyjne XAUUSD; tabela przewiduje rozszerzenie.

### 1.3 strategies
- id uuid PK DEFAULT gen_random_uuid()
- name text NOT NULL -- np. 'mock'
- type text NOT NULL -- 'mock'
- params_json jsonb NOT NULL DEFAULT '{}'
- status text NOT NULL CHECK (status IN ('active','draft')) DEFAULT 'active'
- created_at timestamptz NOT NULL DEFAULT now()

Uwagi:
- Minimum do wtyczkowej architektury; w MVP tylko 'mock'.

### 1.4 signals
- id uuid PK DEFAULT gen_random_uuid()
- strategy_id uuid NOT NULL REFERENCES strategies(id) ON DELETE RESTRICT
- asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE RESTRICT -- domyślnie XAUUSD
- ts timestamptz NOT NULL -- czas sygnału (UTC)
- type text NOT NULL CHECK (type IN ('BUY','SELL','HOLD'))
- confidence int NOT NULL CHECK (confidence BETWEEN 0 AND 100)
- meta_json jsonb NOT NULL DEFAULT '{}' -- pola techniczne: entry_price, rr, sl itp. (opcjonalne)
- created_at timestamptz NOT NULL DEFAULT now()

Uwagi:
- Generowane przez endpoint admina; dzienny limit top‑K=10 (egzekucja po stronie logiki biznesowej/API, nie constraint).

## 2. Relacje
- `auth.users (1) — (1) profiles.user_id` (mapuje rolę użytkownika)
- `strategies (1) — (n) signals.strategy_id`
- `assets (1) — (n) signals.asset_id`

## 3. Indeksy
- `assets(symbol)` UNIQUE
- `strategies(status)`
- `signals(ts DESC)`
- `signals(strategy_id, ts DESC)`
- `signals(asset_id, ts DESC)` (opcjonalnie, gdy zapytania filtrują po aktywie)

## 4. RLS (Row Level Security) — zasady
Włącz RLS na wszystkich tabelach. Polityki rozdzielone per operacja i per rola Supabase.

Wzorzec sprawdzania admina (używany w politykach):
```
exists (
  select 1 from profiles p
  where p.user_id = auth.uid() and p.role = 'admin'
)
```

### 4.1 profiles
- select (authenticated): tylko własny rekord profilu
  - using: `user_id = auth.uid()`
- insert/update/delete: zablokowane dla zwykłych użytkowników (zarządzanie rolami poza UI MVP)
  - using/with check: `false`

### 4.2 assets
- select (authenticated): dozwolone dla wszystkich zalogowanych
  - using: `true`
- insert/update/delete (admin only):
  - using: wzorzec admin jak wyżej
  - with check: wzorzec admin jak wyżej

### 4.3 strategies
- select (authenticated): dozwolone dla wszystkich zalogowanych
  - using: `true`
- insert/update/delete (admin only):
  - using: wzorzec admin
  - with check: wzorzec admin

### 4.4 signals
- select (authenticated): dozwolone dla wszystkich zalogowanych
  - using: `true`
- insert/update/delete (admin only):
  - using: wzorzec admin
  - with check: wzorzec admin

## 5. Uwagi dodatkowe
- Seed (dev):
  - `assets`: XAUUSD
  - `strategies`: 'mock' (active)
  - `profiles`: jeden admin (powiązać z istniejącym użytkownikiem testowym)
- Dzienne top‑K sygnałów (K=10) egzekwowane w warstwie API (granicą jest data UTC `date_trunc('day', ts)`); idempotencja: unikać duplikatów dla danego dnia/strategii/aktywów.
- Brak tabel `plans`, `provider_config`, `forecasts`, `llm_queries`, `citations` w Etapie 1 (przewidziane Po MVP).
