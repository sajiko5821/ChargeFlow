# ChargeFlow — Copilot Instructions

## Project Overview

ChargeFlow is a mobile-first EV charging cost tracking web app. Users log charging sessions, view monthly/yearly statistics, and use a calculator to estimate charging time and cost. The backend persists data in SQLite and optionally exports to CSV.

## Architecture

- **Frontend**: React 19 + TypeScript 5.9 + Tailwind CSS 4 (Vite 7)
- **Backend**: Express 5 + better-sqlite3 (single file: `server/index.ts`)
- **Monorepo**: Frontend and backend live in the same repo, built together
- **Deployment**: Docker (Node 22 Alpine), port 7920, `/data` volume for persistence

### Key Architectural Decisions

- **Single-vehicle model** — the `car` table enforces `id = 1` (only one vehicle)
- **Client-generated UUIDs** — charging session IDs are created on the frontend via `uuid`
- **SPA with API proxy** — Vite proxies `/api/*` to the Express backend in dev; in production, Express serves both the API and the built frontend
- **CSS custom properties for theming** — light/dark mode uses `--color-*` variables defined in `src/index.css`, not Tailwind's dark: prefix
- **i18n via React Context** — `useI18n()` hook provides `t` (translations) and `locale`; translations live in `src/i18n/translations.ts`
- **No ORM** — raw SQL with `better-sqlite3` prepared statements
- **CSV sync** — `syncCsv()` is called after every mutation if `CSV_PATH` is set

## File Structure Conventions

```
server/index.ts          → All backend logic (Express routes, DB, CSV export)
src/components/*.tsx     → One file per tab + BottomNav
src/hooks/*.ts           → Custom React hooks (useDatabase, useTheme, useChargingStats, useI18n)
src/i18n/translations.ts → All user-facing strings (German & English)
src/i18n/I18nContext.tsx  → React context provider + useI18n hook
src/types.ts             → Shared TypeScript interfaces (CarData, ChargingSession, etc.)
src/index.css            → Tailwind directives + CSS custom properties for theming
docs/openapi.yaml        → OpenAPI 3.1 spec for all API endpoints
```

## Coding Conventions

### TypeScript

- Strict mode enabled; `noEmit` is used for type-checking only
- Use `interface` for data shapes, `type` for unions/aliases
- Prefer `const` and arrow functions
- Use `Record<string, unknown>` for raw DB rows, then map to typed interfaces
- Express v5 uses `/{*path}` for wildcard routes (not `*`)

### React

- Functional components only — no classes
- State management via `useState` + `useMemo`, no external state library
- Custom hooks for all side effects and shared logic
- `useI18n()` for all user-facing strings — never hardcode German or English text in JSX
- `useTheme()` for dark mode — returns `{ theme, toggleTheme }`
- Locale-aware formatting: use `locale === 'de' ? 'de-DE' : 'en-US'` for `toLocaleString()`

### Styling

- **Tailwind CSS v4** with `@tailwindcss/vite` plugin (not PostCSS)
- All colors reference CSS custom properties: `text-[var(--color-text)]`, `bg-[var(--color-card)]`, etc.
- Never use hardcoded colors like `bg-white`, `text-gray-600` — always use CSS variables
- Mobile-first: design for narrow viewports, `max-w-lg mx-auto` wrapper

### i18n

- All translations in `src/i18n/translations.ts` — object with `de` and `en` keys
- Parameterized strings use `{placeholder}` syntax, replaced with `.replace('{key}', value)` at usage site
- Month names come from `t.months` array (index 0 = January)
- When adding new strings: add to the `Translations` interface, then to both `de` and `en` objects

### API

- All routes under `/api/`
- JSON request/response, `express.json()` middleware
- Car data: `GET /api/car`, `PUT /api/car`
- Sessions: `GET /api/sessions`, `POST /api/sessions`, `DELETE /api/sessions/:id`
- Every mutation calls `syncCsv()` after the DB write
- OpenAPI spec in `docs/openapi.yaml` — keep it in sync when adding/changing endpoints

### Database

- SQLite via `better-sqlite3` with WAL mode
- Two tables: `car` (single row), `charging_session` (UUID primary key)
- Column naming: `snake_case` in DB, `camelCase` in API/TypeScript
- Always use prepared statements (`.prepare().run()` / `.get()` / `.all()`)

## Docker

- Multi-stage build: stage 1 builds frontend, stage 2 runs production
- Base image: `node:22-alpine`
- Port: `7920`
- Volume: `/data` for `chargeflow.db` and `chargeflow.csv`
- AIO variant adds `cloudflared` binary and custom entrypoint
- CI/CD in `.github/workflows/docker-publish.yaml` — matrix build for both images, QEMU multi-arch (amd64 + arm64)

## Common Tasks

### Adding a new translation string

1. Add key to `Translations` interface in `src/i18n/translations.ts`
2. Add German value to `de` object
3. Add English value to `en` object
4. Use via `const { t } = useI18n()` → `{t.myNewKey}`

### Adding a new API endpoint

1. Add route in `server/index.ts`
2. If it mutates data, call `syncCsv()` after the DB operation
3. Add to `docs/openapi.yaml`
4. Add fetch wrapper in `src/db/database.ts` if needed

### Modifying theme colors

1. Edit CSS custom properties in `src/index.css` (both `:root` and `[data-theme="dark"]`)
2. Reference in components as `var(--color-name)`
