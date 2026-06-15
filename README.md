# Dynamic Address Form — FrankieOne Technical Task

A full-stack customer onboarding form that dynamically adapts address fields based on the selected country. Supports USA, Australia, and Indonesia.

**Live demo:** https://frankieone-address-form-client.vercel.app/

## Setup

### Prerequisites

- Node.js 18+
- npm 8+ (workspaces support)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example server/.env
```

Edit `server/.env` and optionally add your Google Places API key:

```
GOOGLE_PLACES_API_KEY=your_key_here   # optional — autocomplete works without it (no suggestions)
PORT=3001
DATABASE_URL=./data/addresses.db
```

### 3. Run (development)

```bash
# Start both server and client with a single command
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Architecture

```
/
├── client/    Vite + React 18 + TypeScript
├── server/    Express 4 + better-sqlite3 + TypeScript
└── shared/    Country configs + Zod schemas + TypeScript types
```

npm workspaces link the packages. `shared/` is the single source of truth — both the backend validation and frontend form rendering are driven from the same field config definitions.

## API Endpoints

| Method | Path                       | Description                                         |
| ------ | -------------------------- | --------------------------------------------------- |
| `POST` | `/api/addresses`           | Validate and save an address                        |
| `GET`  | `/api/addresses`           | List all saved addresses (`?country=USA` to filter) |
| `GET`  | `/api/addresses/:id`       | Get a single address                                |
| `GET`  | `/api/places/autocomplete` | Google Places suggestions proxy                     |
| `GET`  | `/api/places/details`      | Google Places detail + field parsing proxy          |

## Design Decisions

See [design-decisions.md](design-decisions.md) for full write-up. Key choices:

**Single source of truth (`shared/src/countries.ts`)** — field names, labels, types, required flags, and regex patterns are defined once. The server derives Zod validation schemas from this, and the client imports it directly for form rendering. Adding a new country is one object entry — no schema migrations, no frontend changes.

**JSON column for dynamic fields** — SQLite stores address fields as `TEXT` (JSON). All address fields (including postal code, which varies by country) are stored in this JSON blob. This avoids wide nullable tables and eliminates per-country schema migrations.

**Zod at the API layer** — schemas are built dynamically from the country config, so validation rules stay in sync with the field definitions. `.safeParse()` returns structured field-level errors in a `{ errors: { fieldName: "message" } }` envelope.

**Google Places proxied through backend** — the API key never touches the client bundle. The `/api/places/*` routes call Google and return pre-parsed fields mapped to each country's schema.

**TanStack Query** — the saved-addresses list is automatically invalidated and refetched after each save mutation. Autocomplete suggestions are debounced and cached per input+country key.

**key-based form remount** — when the country changes, the `ManualForm` component is remounted via a `key` prop, which re-initialises `react-hook-form` with the new schema and empty default values. This avoids stale validation state.

## Tech Stack

| Layer        | Choice                                 |
| ------------ | -------------------------------------- |
| Frontend     | React 18, Vite 6, TypeScript           |
| Styling      | Tailwind CSS v3                        |
| Forms        | React Hook Form + Zod resolver         |
| Server state | TanStack Query v5                      |
| Backend      | Express 4                              |
| Database     | SQLite via better-sqlite3              |
| Validation   | Zod (shared between client and server) |
| Testing      | Vitest, Supertest, Playwright          |

## Testing

### Run all unit and integration tests

```bash
npm test
```

This runs tests across all three workspaces in order:

| Workspace | Tool               | What is tested                                          |
| --------- | ------------------ | ------------------------------------------------------- |
| `shared`  | Vitest             | `buildSchema()` validation logic, country config shape  |
| `server`  | Vitest + Supertest | Express route behaviour against an in-memory SQLite DB  |
| `client`  | Vitest + jsdom     | `CountrySelector` and `DynamicFieldRenderer` components |

### Run E2E tests (Playwright)

The E2E suite requires the dev servers to be running, or Playwright will start them automatically.

```bash
# Headless (fast, no browser window — suitable for CI)
npm run test:e2e

# Interactive UI explorer (recommended for development)
npm run test:e2e:ui

# Headed — opens a browser window at normal speed
npm run test:e2e:headed

# Headed — opens a browser window with 500 ms delay between actions (easy to follow)
npm run test:e2e:headed:slow
```

E2E tests cover:

- Country switching renders the correct fields
- Client-side and server-side validation error messages
- Full happy-path submission and appearance in the Saved Addresses panel
- Form resets to autocomplete mode after a successful save

### Test architecture notes

- The server uses `DATABASE_URL=:memory:` during tests (set in `server/vitest.config.ts`), so tests run against a fresh in-memory SQLite instance with no disk I/O and no leftover data.
- `server/src/index.ts` exports `app` separately and only calls `app.listen()` when `NODE_ENV !== "test"`, so Supertest can import the app without starting a real server on a port.
- The Playwright config sets `workers: 1` so headed runs use a single browser window instead of spawning multiple browsers in parallel.
