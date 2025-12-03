# 10x Astro Starter

A modern, opinionated starter template for building fast, accessible, and AI-friendly web applications.

## Tech Stack

- [Astro](https://astro.build/) v5.5.5 - Modern web framework for building fast, content-focused websites
- [React](https://react.dev/) v19.0.0 - UI library for building interactive components
- [TypeScript](https://www.typescriptlang.org/) v5 - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) v4.0.17 - Utility-first CSS framework

## Prerequisites

- Node.js v22.14.0 (as specified in `.nvmrc`)
- npm (comes with Node.js)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/przeprogramowani/10x-astro-starter.git
cd 10x-astro-starter
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## How to run locally (GoldTrader)

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
# create local env file from example
copy docs\env.example .env.local   # Windows PowerShell: Copy-Item docs/env.example .env.local
```

Fill the keys in `.env.local`:

```env
# Server-side (Astro on Node)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=sb_publishable_...

# Client-side (browser)
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...

# Optional app base (used by smoke)
APP_URL=http://localhost:4321
```

Tip: For local Supabase, use “Publishable key” as anon; do not use the secret key in the client.

3. Run the dev server (Astro on port 4321):

```bash
npm run dev
```

Open `http://localhost:4321`.

## GoldTrader MVP status

Aktualny stan funkcjonalności GoldTradera (auth, dashboard sygnałów XAUUSD, panel admina do assets, API + E2E/CI/CD) jest śledzony w pliku `docs/mvp-tracker.md` — tam znajdziesz checklistę MVP oraz historię raportów z 10xDevs.  
Planujemy (po MVP) podpięcie Vercel Cron do endpointu `POST /api/admin/generate-signals`; szkic rozwiązania i uwagi bezpieczeństwa opisuje `docs/vercel-cron-generate-signals.md`.

## Deploy na Vercel + Supabase Cloud (GoldTrader)

1. **Przygotuj Supabase Cloud**
   - Utwórz projekt w Supabase i zapisz jego `Project URL` oraz `anon public key` (zakładka **Project Settings → API**).
   - Skopiuj plik `docs/env.cloud.example` jako bazę konfiguracji:

   ```bash
   # lokalnie, do podglądu/edycji (nie commituj prawdziwych kluczy)
   copy docs\env.cloud.example .env.cloud.local
   ```

2. **Podłącz repo do Vercel**
   - Zaloguj się na `https://vercel.com` przez GitHub.
   - Dodaj nowy projekt z tego repo (`GoldTrader`), ustaw branch produkcyjny na `main`.

3. **Ustaw zmienne środowiskowe w Vercel (Project → Settings → Environment Variables)**

   Ustaw dla środowisk **Production** i **Preview**:

   ```text
   SUPABASE_URL             = https://TWÓJ_PROJECT_REF.supabase.co
   SUPABASE_ANON_KEY        = TWÓJ_CLOUD_ANON_KEY

   PUBLIC_SUPABASE_URL      = https://TWÓJ_PROJECT_REF.supabase.co
   PUBLIC_SUPABASE_ANON_KEY = TWÓJ_CLOUD_ANON_KEY

   APP_URL                  = https://twoj-projekt.vercel.app   # po pierwszym deployu podmień na realny URL
   NODE_ENV                 = production
   ```

4. **Skonfiguruj Supabase pod Vercel (redirecty)**
   - Supabase → **Authentication → URL configuration**:
     - `Site URL` = `https://twoj-projekt.vercel.app/`
     - Additional redirect URLs dodaj:
       - `https://twoj-projekt.vercel.app/auth/reset-password`
       - `http://localhost:4321/auth/reset-password` (dla dev).

5. **Migracje bazy w CI (GitHub Actions → Secrets and variables → Actions)**

   Zgodnie z `docs/env.cloud.example` i `.github/workflows/ci.yml` ustaw:

   ```text
   SUPABASE_DB_URL = postgres://postgres:HASŁO@TWÓJ_POOLER_HOST:6543/postgres?sslmode=require
   ```

   Connection string do Session Poolera (host `*.pooler.supabase.com`, port `6543`) znajdziesz w Supabase → **Database → Connection pooling (Session)**.

6. **Pierwszy deploy**
   - Zrób mały commit na `main` lub kliknij „Deploy” w Vercel.
   - Po udanym buildzie aplikacja będzie dostępna pod adresem w stylu `https://gold-trader-one.vercel.app/`.
   - Zaktualizuj `APP_URL` w Vercel na ten finalny URL.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run smoke` - Run smoke checks against APP_URL (defaults to http://localhost:4321)

## Smoke tests

Quick availability checks for key routes. By default they target `http://localhost:4321`. To override, set `APP_URL` in your environment or `.env.local`.

Run:

```bash
npm run smoke
```

Expected output (example):

```text
OK   http://localhost:4321/
OK   http://localhost:4321/api/health {status=ok}
OK   http://localhost:4321/auth/login
OK   http://localhost:4321/auth/register
```

## Project Structure

```md
.
├── src/
│ ├── layouts/ # Astro layouts
│ ├── pages/ # Astro pages
│ │ └── api/ # API endpoints
│ ├── components/ # UI components (Astro & React)
│ └── assets/ # Static assets
├── public/ # Public assets
```

## AI Development Support

This project is configured with AI development tools to enhance the development experience, providing guidelines for:

- Project structure
- Coding practices
- Frontend development
- Styling with Tailwind
- Accessibility best practices
- Astro and React guidelines

### Cursor IDE

The project includes AI rules in `.cursor/rules/` directory that help Cursor IDE understand the project structure and provide better code suggestions.

### GitHub Copilot

AI instructions for GitHub Copilot are available in `.github/copilot-instructions.md`

### Windsurf

The `.windsurfrules` file contains AI configuration for Windsurf.

## Contributing

Please follow the AI guidelines and coding practices defined in the AI configuration files when contributing to this project.

## Project Docs

- Product Requirements Document (PRD): `./docs/PRD.md`
- Environment variables example: `./docs/env.example`
- MVP tracker: `./docs/mvp-tracker.md`
- API summary (MVP): `./docs/api.md`

## Rules & Docs

### 10xRules (AI development standards)

**Astro**

- Use `.astro` components for static content; server endpoints for API routes
- SSR when needed; `Astro.cookies` for server-side cookie management
- `import.meta.env` for environment variables

**React**

- Functional components + hooks
- Performance: `React.memo`, `useCallback`/`useMemo`, `useTransition`

**Tailwind**

- Organize styles with `@layer` directive
- Use `@apply` for reusable patterns
- Leverage responsive variants (sm:, md:, lg:) and dark mode

### Documentation References

**Supabase Auth**

- [Auth UI + createClient setup](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/auth-helpers/auth-ui.mdx)
- [MFA & Access Token hooks](https://github.com/supabase/supabase/blob/master/apps/www/_blog/2024-08-14-third-party-auth-mfa-phone-send-hooks.mdx)

**Astro Server Endpoints**

- [API Endpoints guide](https://github.com/withastro/docs/blob/main/src/content/docs/en/guides/endpoints.mdx)
- [On-demand rendering](https://github.com/withastro/docs/blob/main/src/content/docs/en/guides/on-demand-rendering.mdx)

## License

MIT
