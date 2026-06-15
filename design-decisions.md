# FrankieOne Technical Task — Design Decisions & Trade-offs

## 1. Database Schema

**Decision: Minimal schema with JSON TEXT column for dynamic fields**

```sql
CREATE TABLE IF NOT EXISTS addresses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  country_code TEXT NOT NULL,
  fields       TEXT NOT NULL, -- JSON string storing all dynamic fields
  created_at   TEXT NOT NULL
)
```

**Why not flat table (all columns nullable)?**
Gets wide fast as more countries are added. Many null columns per row. Every new country or field change also requires a schema migration (`ALTER TABLE ADD COLUMN`) — meaning a code change, a migration file, and a deployment just to support a new address format.

**Why JSON in TEXT column?**

- Dynamic fields per country stored flexibly — adding a new country requires no schema migration
- SQLite does not support JSONB natively; TEXT with JSON functions (`json_extract`) is the equivalent
- Server handles `JSON.stringify` on write and `JSON.parse` on read
- All country-specific fields (postal code, state, province, etc.) live in the JSON blob — no dedicated columns needed

**Trade-off acknowledged:**
For a production system on Postgres with 50+ countries, JSONB with a GIN index would enable efficient querying into the JSON structure. For the current SQLite approach, filtering by individual fields within the JSON requires `json_extract()` which is less efficient than indexed columns — acceptable at this scale.

---

## 2. Validation Strategy

**Decision: Zod schemas built dynamically from country field configs**

```ts
// shared/src/schemas.ts
function fieldToZod(field: FieldConfig): z.ZodTypeAny {
  if (field.required) {
    let schema = z.string().min(1, `${field.label} is required`);
    if (field.pattern) {
      schema = schema.regex(
        new RegExp(field.pattern),
        field.patternMessage ?? "Invalid format",
      );
    }
    return schema;
  }
  return z.string();
}

export function buildSchema(countryCode: string) {
  const config = COUNTRIES[countryCode];
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of config.fields) {
    shape[field.name] = fieldToZod(field);
  }
  return z.object(shape);
}
```

- Schemas are derived from the same `FieldConfig[]` that drives the UI — adding a field to a country's config automatically updates validation
- Zod validates the payload before it hits the DB — "no DB-level validation" con of JSON column is fully mitigated
- `.safeParse()` returns field-level errors, enabling structured `400` responses: `{ errors: { zip: "Must be exactly 5 digits" } }`
- Schemas live in `shared/` folder — reused on both frontend (React Hook Form + Zod resolver) and backend (Express handler)

---

## 3. Country Config as Shared Package

**Decision: Single source of truth via `shared/` package**

```ts
// shared/src/countries.ts
export const COUNTRIES: Record<string, CountryConfig> = {
  USA: { code: "USA", name: "United States", flag: "🇺🇸", fields: [...] },
  AUS: { code: "AUS", name: "Australia", flag: "🇦🇺", fields: [...] },
  IDN: { code: "IDN", name: "Indonesia", flag: "🇮🇩", fields: [...] },
};
```

Both server and client import `COUNTRIES` directly from the `shared` package. The same field definitions drive form rendering on the frontend and schema validation on the backend.

**Why not a runtime API endpoint (e.g. `GET /api/countries/:code/config`)?**
Adds an extra network request on page load, introduces loading states, and the config is static — it changes with code deploys, not user actions. A shared package gives compile-time safety and zero-latency access.

**Why not store in DB?**
Overkill for this task — config changes are code changes, not data changes.

This directly addresses the bonus requirement: _"show how you would design the API to support dynamic country-specific metadata (field names, validation rules)"_. Adding a new country requires adding one entry to `COUNTRIES` — no schema migrations, no separate frontend changes.

---

## 4. Project Structure

**Decision: Monorepo with React Vite + Express**

```
/
├── client/   (Vite + React + TypeScript)
├── server/   (Express + better-sqlite3 + TypeScript)
└── shared/   (Zod schemas + TypeScript types)
```

**Why not Next.js?**
The spec explicitly mentions Express/Hono/Fastify. Separate frontend and backend is more explicit and easier for the interviewer to evaluate.

**Why monorepo over two separate repos?**
Simpler setup, single `npm install` at root, and enables the `shared/` folder pattern.

**Why `shared/` folder?**
Zod schemas defined once, used in both frontend validation (React Hook Form resolver) and backend validation (Express handler). Single source of truth for validation logic.

---

## 5. Key-based Form Remount

**Decision: Remount `ManualForm` via `key` prop on country change**

When the country changes, `ManualForm` receives a new `key` prop (`${countryCode}-${successKey}`), forcing React to fully unmount and remount the component. This re-initialises `react-hook-form` with the new country's schema and empty default values.

**Why not reset the form programmatically with `reset()`?**
Calling `reset()` inside a `useEffect` on country change leaves a single component instance managing multiple schemas across its lifetime — stale validation errors, residual field state, and the old Zod resolver can bleed through. A remount is a clean slate: new `useForm`, new resolver, new defaults. It's simpler and more correct.

---

## 6. Frontend State Management

**Decision: React Hook Form + Zod + TanStack Query**

- React Hook Form handles form state and submission
- Zod resolver connects country-specific schemas directly to form validation
- TanStack Query manages server state — the saved addresses list is fetched, cached, and automatically invalidated after each successful save mutation
- No Redux/Zustand — overkill for a single form flow; TanStack Query covers the only shared async state (the addresses list)

---

## 7. Google Places Autocomplete

**Decision: Proxy Google Places API through the backend**

All autocomplete and place detail requests go through `/api/places/*` on the Express server rather than calling Google directly from the browser.

**Why not call Google Places from the frontend directly?**
The API key would be embedded in the client bundle — visible to anyone via DevTools. Proxying through the backend keeps the key server-side only, where it can also be rate-limited or swapped without a frontend deploy.

---

## 8. Summary Table

| Decision           | Choice                                             | Key Reason                                         |
| ------------------ | -------------------------------------------------- | -------------------------------------------------- |
| DB Schema          | JSON in TEXT column, minimal fixed columns         | Flexible, no migration per country                 |
| Validation         | Zod schemas built dynamically from field configs   | Mitigates JSON column con, field-level errors      |
| Country config     | `shared/` package imported by both client & server | Single source of truth, compile-time safety        |
| Project structure  | Vite + Express monorepo                            | Matches spec, explicit separation                  |
| Shared types       | `shared/` Zod schemas + country configs            | Reused frontend + backend                          |
| Form remount       | `key` prop on country change                       | Clean slate — avoids stale schema/validation state |
| Form management    | React Hook Form + Zod + TanStack Query             | Clean form state, cached server state, no overkill |
| Places integration | Google Places proxied through backend              | API key never exposed to client                    |
