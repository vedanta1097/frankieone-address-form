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
Gets wide fast as more countries are added. Many null columns per row.

**Why not EAV (Entity-Attribute-Value)?**
Terrible for reads — requires pivoting rows into columns. Overkill and genuinely bad for this use case.

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
├── server/   (Express + Drizzle + SQLite)
└── shared/   (Zod schemas + TypeScript types)
```

**Why not Next.js?**
The spec explicitly mentions Express/Hono/Fastify. Separate frontend and backend is more explicit and easier for the interviewer to evaluate.

**Why monorepo over two separate repos?**
Simpler setup, single `npm install` at root, and enables the `shared/` folder pattern.

**Why `shared/` folder?**
Zod schemas defined once, used in both frontend validation (React Hook Form resolver) and backend validation (Express handler). This is the strongest signal of senior-level thinking — single source of truth for validation logic.

---

## 5. Frontend State Management

**Decision: React Hook Form + Zod**

- React Hook Form handles form state and submission
- Zod resolver connects country-specific schemas directly to form validation
- No Redux/Zustand — overkill for a single form flow

---

## 6. Google Places Autocomplete

**Decision: Shallow integration**

- Show autocomplete suggestions for quick address entry
- On selection, attempt to parse and pre-fill manual fields (line1, city, postal code)
- "Manually Edit" button always available to override

**Trade-off:** Full Places API parsing (structured address components) is more robust but time-consuming. Shallow integration demonstrates the UX pattern within the 2-hour timebox.

---

## Summary Table

| Decision           | Choice                                             | Key Reason                                    |
| ------------------ | -------------------------------------------------- | --------------------------------------------- |
| DB Schema          | JSON in TEXT column, minimal fixed columns         | Flexible, no migration per country            |
| Validation         | Zod schemas built dynamically from field configs   | Mitigates JSON column con, field-level errors |
| Country config     | `shared/` package imported by both client & server | Single source of truth, compile-time safety   |
| Project structure  | Vite + Express monorepo                            | Matches spec, explicit separation             |
| Shared types       | `shared/` Zod schemas + country configs            | Reused frontend + backend                     |
| Form management    | React Hook Form + Zod                              | Clean, no overkill                            |
| Places integration | Shallow + manual override                          | Pragmatic within timebox                      |
