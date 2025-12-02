## Vercel Cron — szkic dla `/api/admin/generate-signals`

Ten dokument opisuje, jak po MVP można podpiąć Vercel Cron do endpointu `POST /api/admin/generate-signals`, żeby okresowo generować mockowe sygnały dla XAUUSD.

### 1. Założenia

- Backend (Astro) jest już wdrożony na Vercel pod domeną np. `https://gold-trader-one.vercel.app`.
- Endpoint `POST /api/admin/generate-signals`:
  - wymaga **tokena admina** w nagłówku `Authorization: Bearer <jwt>`,
  - ma limity dobowego użycia (`enforceDailyLimit("signals:generate", 20)`),
  - jest idempotentny „w sensie biznesowym” — wielokrotne wywołanie dodaje kolejne mockowe sygnały, ale nie psuje stanu.

### 2. Jak to spiąć z Vercel Cron (wysoki poziom)

1. W panelu Vercel:
   - `Project` → `Settings` → `Cron Jobs` → `Add`.
2. Konfiguracja przykładowa:
   - **Path**: `/api/admin/generate-signals`
   - **Method**: `POST`
   - **Schedule**: np. `0 * * * *` (raz na godzinę) lub `0 6 * * *` (raz dziennie o 06:00 UTC).
3. Nagłówki / auth:
   - Vercel Cron **nie dodaje sam z siebie** tokena Supabase,
   - żeby endpoint działał, trzeba dodać nagłówek `Authorization` z tokenem admina.

### 3. Skąd wziąć token admina do Crona

Na razie **NIE trzymamy tokena admina w Vercel ENV** — to byłoby kruche (krótki czas życia tokenu). Zamiast tego rozsądniejsze, produkcyjne podejścia (poza MVP) to np.:

- osobny „service user” z kluczem serwisowym (Supabase Service Role) i dedykowanym endpointem tylko dla Crone’a,
- albo mechanizm, który przy wywołaniu Crone’a loguje się do Supabase (po serwerowej stronie) i generuje tymczasowy token.

Na etapie MVP **świadomie tego nie wdrażamy** — endpoint `/api/admin/generate-signals` służy nam głównie do ręcznego generowania mocków (curl / panel admina), a Vercel Cron jest tylko opisanym szkicem „co dalej”.

### 4. Co trzeba będzie dopisać po MVP

1. Dedykowany endpoint tylko dla Crone’a, np. `POST /api/admin/generate-signals-cron`:
   - zabezpieczony np. sekretnym nagłówkiem `X-CRON-SECRET` ustawionym w Vercel ENV,
   - po stronie serwera korzysta z Supabase **service key** (nie z tokenu usera),
   - woła wewnętrznie ten sam kod generujący mock sygnały (wydzielony do wspólnej funkcji).
2. Konfiguracja Vercel Cron:
   - Path: `/api/admin/generate-signals-cron`
   - Method: `POST`
   - Nagłówek `X-CRON-SECRET: ...` z sekretem z ENV.
3. E2E/integra test:
   - prosty test, który uderza w endpoint „cronowy” na środowisku preview i sprawdza, że dodaje sygnały dla XAUUSD (przy wyłączonym limicie dobowym lub z limitem przestawionym na testowe wartości).

### 5. Status na dziś

- Endpoint `/api/admin/generate-signals` jest gotowy, testowany ręcznie i w testach API.
- Ten plik **jest jedynie szkicem** integracji z Vercel Cron i NIE ma jeszcze żadnej kodowej integracji (brak nowego endpointu, brak Crone’a w panelu Vercel).
- Po MVP, jeśli będziemy automatyzować generowanie sygnałów, należy wrócić do tego dokumentu i zaimplementować opisany powyżej wariant z dedykowanym endpointem cronowym oraz sekretnym nagłówkiem.
