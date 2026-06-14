# Implementation Plan — Dynamic Address Form

## Architecture

```
/
├── client/          (Vite + React + TypeScript)
├── server/          (Express + Drizzle ORM + SQLite)
├── shared/          (Country field configs, derived Zod schemas, TypeScript types)
├── package.json     (npm workspaces root)
└── README.md
```

Resolve `shared/` via npm workspaces:

```json
// root package.json
{ "workspaces": ["client", "server", "shared"] }
```

---

## 1. Shared Country Config (Single Source of Truth)

File: `shared/src/countries.ts`

Define a declarative field config per country. Both the Zod schemas AND the frontend form rendering are derived from this. Never define validation rules in two places.

```ts
export type FieldType = "text" | "select";

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // for select fields
  pattern?: string; // regex string for text validation
  patternMessage?: string; // human-readable error for pattern mismatch
}

export interface CountryConfig {
  code: string;
  name: string;
  fields: FieldConfig[];
}

export const COUNTRIES: Record<string, CountryConfig> = {
  USA: {
    code: "USA",
    name: "United States",
    fields: [
      { name: "line1", label: "Address Line 1", type: "text", required: true },
      { name: "line2", label: "Address Line 2", type: "text", required: false },
      { name: "city", label: "City", type: "text", required: true },
      {
        name: "state",
        label: "State",
        type: "select",
        required: true,
        options: [
          "AL",
          "AK",
          "AZ",
          "AR",
          "CA",
          "CO",
          "CT",
          "DE",
          "FL",
          "GA",
          "HI",
          "ID",
          "IL",
          "IN",
          "IA",
          "KS",
          "KY",
          "LA",
          "ME",
          "MD",
          "MA",
          "MI",
          "MN",
          "MS",
          "MO",
          "MT",
          "NE",
          "NV",
          "NH",
          "NJ",
          "NM",
          "NY",
          "NC",
          "ND",
          "OH",
          "OK",
          "OR",
          "PA",
          "RI",
          "SC",
          "SD",
          "TN",
          "TX",
          "UT",
          "VT",
          "VA",
          "WA",
          "WV",
          "WI",
          "WY",
        ],
      },
      {
        name: "zip",
        label: "ZIP Code",
        type: "text",
        required: true,
        pattern: "^\\d{5}$",
        patternMessage: "Must be 5 digits",
      },
    ],
  },
  AUS: {
    code: "AUS",
    name: "Australia",
    fields: [
      { name: "line1", label: "Address Line 1", type: "text", required: true },
      { name: "line2", label: "Address Line 2", type: "text", required: false },
      { name: "suburb", label: "Suburb", type: "text", required: true },
      {
        name: "state",
        label: "State",
        type: "select",
        required: true,
        options: ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"],
      },
      {
        name: "postcode",
        label: "Postcode",
        type: "text",
        required: true,
        pattern: "^\\d{4}$",
        patternMessage: "Must be 4 digits",
      },
    ],
  },
  IDN: {
    code: "IDN",
    name: "Indonesia",
    fields: [
      {
        name: "province",
        label: "Province",
        type: "select",
        required: true,
        options: [
          "Aceh",
          "Bali",
          "Banten",
          "Bengkulu",
          "Gorontalo",
          "Jakarta",
          "Jambi",
          "Jawa Barat",
          "Jawa Tengah",
          "Jawa Timur",
          "Kalimantan Barat",
          "Kalimantan Selatan",
          "Kalimantan Tengah",
          "Kalimantan Timur",
          "Kalimantan Utara",
          "Kepulauan Bangka Belitung",
          "Kepulauan Riau",
          "Lampung",
          "Maluku",
          "Maluku Utara",
          "Nusa Tenggara Barat",
          "Nusa Tenggara Timur",
          "Papua",
          "Papua Barat",
          "Riau",
          "Sulawesi Barat",
          "Sulawesi Selatan",
          "Sulawesi Tengah",
          "Sulawesi Tenggara",
          "Sulawesi Utara",
          "Sumatra Barat",
          "Sumatra Selatan",
          "Sumatra Utara",
          "Yogyakarta",
        ],
      },
      { name: "city", label: "City / Regency", type: "text", required: true },
      {
        name: "district",
        label: "District (Kecamatan)",
        type: "text",
        required: true,
      },
      {
        name: "village",
        label: "Village (Kelurahan/Desa)",
        type: "text",
        required: false,
      },
      {
        name: "postal_code",
        label: "Postal Code",
        type: "text",
        required: true,
        pattern: "^\\d{5}$",
        patternMessage: "Must be 5 digits",
      },
      { name: "street", label: "Street Address", type: "text", required: true },
    ],
  },
};
```

File: `shared/src/schemas.ts`

Derive Zod schemas dynamically from the field config:

```ts
import { z } from "zod";
import { COUNTRIES, FieldConfig } from "./countries";

function fieldToZod(field: FieldConfig): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  if (field.type === "select" && field.options) {
    schema = z.enum(field.options as [string, ...string[]]);
  } else {
    schema = z.string();
    if (field.pattern) {
      schema = (schema as z.ZodString).regex(
        new RegExp(field.pattern),
        field.patternMessage || "Invalid format",
      );
    }
  }

  if (field.required) {
    schema = (schema as z.ZodString).min(1, `${field.label} is required`);
  } else {
    schema = schema.optional().or(z.literal(""));
  }

  return schema;
}

export function buildSchema(countryCode: string): z.ZodObject<any> {
  const config = COUNTRIES[countryCode];
  if (!config) throw new Error(`Unknown country: ${countryCode}`);

  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of config.fields) {
    shape[field.name] = fieldToZod(field);
  }
  return z.object(shape);
}

// Pre-built schemas for convenience
export const SCHEMAS = Object.fromEntries(
  Object.keys(COUNTRIES).map((code) => [code, buildSchema(code)]),
);
```

File: `shared/src/types.ts`

```ts
export interface AddressPayload {
  country_code: string;
  fields: Record<string, string>;
}

export interface AddressRecord {
  id: number;
  country_code: string;
  fields: Record<string, string>;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}
```

File: `shared/package.json`

```json
{
  "name": "shared",
  "version": "1.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "zod": "^3.23.0"
  }
}
```

---

## 2. Backend (Express + Drizzle + SQLite)

### Database Schema

File: `server/src/db/schema.ts`

```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const addresses = sqliteTable("addresses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  country_code: text("country_code").notNull(),
  fields: text("fields", { mode: "json" }).notNull(), // JSON string of all dynamic fields
  created_at: text("created_at").default("CURRENT_TIMESTAMP"),
});
```

### API Endpoints

| Method | Path                 | Description                                           |
| ------ | -------------------- | ----------------------------------------------------- |
| `POST` | `/api/addresses`     | Validate and save an address                          |
| `GET`  | `/api/addresses`     | List saved addresses (optional `?country=USA` filter) |
| `GET`  | `/api/addresses/:id` | Get a single address by ID                            |

### POST /api/addresses handler logic

```ts
// 1. Extract country_code and fields from request body
// 2. Look up the Zod schema for that country from shared/
// 3. Run schema.safeParse(fields)
// 4. If invalid, return { success: false, errors: { fieldName: "message" } }
// 5. Insert into DB: { country_code, fields: JSON.stringify(fields) }
// 6. Return { success: true, data: { id, ... } }
```

### GET /api/addresses handler logic

```ts
// 1. Read optional query param: ?country=USA
// 2. Query DB, optionally filtering by country_code
// 3. Parse fields JSON for each row
// 4. Return { success: true, data: AddressRecord[] }
```

### GET /api/countries/:code/config handler logic

```ts
// 1. Look up COUNTRIES[code] from shared
// 2. If not found, return 404 { success: false, errors: { country: "Not supported" } }
// 3. Return { success: true, data: countryConfig }
```

### Server setup notes

- Use `cors()` middleware (allow `http://localhost:5173`)
- Use `express.json()` middleware
- Run on port 3001
- On startup, run Drizzle migrations (or `db.run(CREATE TABLE IF NOT EXISTS ...)`
- Store the Google Places API key in `.env` only — never expose to client (see section 5)

---

## 3. Frontend (Vite + React + TypeScript)

### Dependencies

- `react-hook-form` + `@hookform/resolvers` (form management + Zod integration)
- `@tanstack/react-query` (server state caching, mutations, auto-refetch)
- `zod` (via shared package)
- `axios` or `fetch` (API calls)
- `tailwindcss` (styling — quick responsive UI)

### Component Tree

```
<App>
  <AddressForm>
    <CountrySelector />         — dropdown, fires country change
    <AutocompleteInput />       — Google Places input (visible when NOT in manual mode)
    <ManualEditButton />        — toggles manual mode
    <DynamicFieldRenderer />    — renders fields based on country config (visible in manual mode)
    <SubmitButton />
  </AddressForm>
  <SavedAddresses />            — lists previously saved addresses (GET /api/addresses)
</App>
```

### TanStack Query usage

```tsx
// Wrap app in QueryClientProvider in main.tsx
const queryClient = new QueryClient();

// Saved addresses list — auto-refetches after mutations
const { data: addresses } = useQuery({
  queryKey: ["addresses"],
  queryFn: fetchAddresses,
});

// Save address mutation — invalidates list on success
const mutation = useMutation({
  mutationFn: saveAddress,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
});

// Places autocomplete — debounced query
const { data: suggestions } = useQuery({
  queryKey: ["places", "autocomplete", debouncedInput, countryCode],
  queryFn: () => fetchAutocompleteSuggestions(debouncedInput, countryCode),
  enabled: debouncedInput.length > 2,
});
```

### Key behaviors

1. **Country changes** → read config directly from `COUNTRIES` in `shared/` (no API call), reset form fields
2. **Autocomplete mode** (default):
   - Show a single Google Places autocomplete input
   - On place selected → parse address components → switch to manual mode with fields pre-filled
   - "Manually Edit" button also available to switch without autocomplete
3. **Manual mode**:
   - Hide autocomplete input
   - Render fields dynamically from country config
   - Each field rendered based on `type`: text input or select dropdown
   - Validation via React Hook Form + Zod resolver using `buildSchema(countryCode)`
   - "Back to Search" button to return to autocomplete mode
4. **Submit** → POST to `/api/addresses`, show success/error feedback
5. **Saved addresses** → on page load and after each save, fetch and display list from `GET /api/addresses`

### DynamicFieldRenderer logic

```tsx
// For each field in countryConfig.fields:
//   if field.type === 'select' → render <select> with field.options
//   if field.type === 'text' → render <input type="text">
//   Show validation error from react-hook-form errors[field.name]
```

---

## 4. Google Places Autocomplete

### Security: Proxy through backend

Do NOT put the Google API key in the frontend. Instead:

- Backend exposes `GET /api/places/autocomplete?input=...&country=...`
- Backend calls Google Places API with the key from `.env`
- Backend exposes `GET /api/places/details?place_id=...`
- Frontend calls these backend proxies

This avoids exposing the API key in client-side JavaScript.

### Parsing place details into form fields

When a place is selected:

1. Frontend calls `/api/places/details?place_id=...`
2. Backend returns structured `address_components` from Google
3. Frontend maps components to country-specific fields:

```ts
// Mapping logic (approximate):
// 'street_number' + 'route' → line1
// 'locality' or 'sublocality' → city / suburb
// 'administrative_area_level_1' → state / province
// 'postal_code' → zip / postcode / postal_code
```

4. Pre-fill manual form fields with parsed values
5. Switch to manual mode so user can review/edit

### Fallback

If Google Places parsing is incomplete (common for Indonesian addresses), the user can always manually fill remaining fields. The form should not block submission just because autocomplete didn't fill everything.

---

## 5. Environment Variables

File: `.env.example`

```
GOOGLE_PLACES_API_KEY=your_key_here
PORT=3001
DATABASE_URL=./data/addresses.db
```

- `.env` is gitignored
- Frontend has NO env vars containing API keys
- Frontend only knows backend URL: `VITE_API_URL=http://localhost:3001`

---

## 6. API Response Contract

All endpoints return a consistent envelope:

```ts
// Success
{ "success": true, "data": <payload> }

// Validation error (400)
{ "success": false, "errors": { "zip": "Must be 5 digits", "city": "City is required" } }

// Not found (404)
{ "success": false, "errors": { "message": "Address not found" } }
```

---

## 7. File-by-File Checklist

### Root

- [ ] `package.json` — workspaces config, scripts (`dev`, `build`)
- [ ] `.gitignore` — node_modules, .env, \*.db
- [ ] `.env.example`
- [ ] `README.md` — setup instructions

### shared/

- [ ] `package.json`
- [ ] `src/index.ts` — re-exports everything
- [ ] `src/countries.ts` — country field configs
- [ ] `src/schemas.ts` — Zod schema builder
- [ ] `src/types.ts` — TypeScript interfaces

### server/

- [ ] `package.json` — deps: express, cors, drizzle-orm, better-sqlite3, zod, dotenv
- [ ] `tsconfig.json`
- [ ] `src/index.ts` — app setup, listen
- [ ] `src/db/schema.ts` — Drizzle table definition
- [ ] `src/db/index.ts` — DB connection setup
- [ ] `src/routes/addresses.ts` — POST + GET handlers
- [ ] `src/routes/places.ts` — Google Places proxy

### client/

- [ ] `package.json` — deps: react, react-dom, react-hook-form, @hookform/resolvers, @tanstack/react-query, zod, axios, tailwindcss
- [ ] `vite.config.ts`
- [ ] `tsconfig.json`
- [ ] `tailwind.config.js`
- [ ] `src/main.tsx`
- [ ] `src/App.tsx`
- [ ] `src/components/AddressForm.tsx` — orchestrates form state and mode
- [ ] `src/components/CountrySelector.tsx`
- [ ] `src/components/AutocompleteInput.tsx`
- [ ] `src/components/DynamicFieldRenderer.tsx`
- [ ] `src/components/SavedAddresses.tsx`
- [ ] `src/api.ts` — axios/fetch wrapper for backend calls

---

## 8. Run Instructions (for README)

```bash
# Install all dependencies
npm install

# Set up environment
cp .env.example .env
# Add your GOOGLE_PLACES_API_KEY to .env

# Start backend (port 3001)
npm run dev --workspace=server

# Start frontend (port 5173)
npm run dev --workspace=client
```

---

## 9. Key Principles

1. **Single source of truth** — field configs in `shared/countries.ts` drive everything: backend validation, frontend rendering, API config responses
2. **No API key on client** — Google Places proxied through backend
3. **Consistent error responses** — same shape for all endpoints
4. **Dynamic by design** — adding a new country = adding one entry to `COUNTRIES` object, zero schema migrations, zero frontend changes
