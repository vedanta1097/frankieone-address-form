import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../index";

// db.ts reads DATABASE_URL at module load time.
// vitest.config.ts sets DATABASE_URL=":memory:" so all tests run against
// a fresh in-memory SQLite instance — no disk files are created or modified.

// ─── Health ───────────────────────────────────────────────────────────────────
describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

// ─── POST /api/addresses ─────────────────────────────────────────────────────
describe("POST /api/addresses", () => {
  it("returns 400 when country_code is missing", async () => {
    const res = await request(app)
      .post("/api/addresses")
      .send({
        fields: {
          line1: "123 Main St",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.country_code).toBeDefined();
  });

  it("returns 400 when fields object is missing", async () => {
    const res = await request(app)
      .post("/api/addresses")
      .send({ country_code: "USA" });
    expect(res.status).toBe(400);
    expect(res.body.errors.fields).toBeDefined();
  });

  it("returns 400 for unsupported country code", async () => {
    const res = await request(app)
      .post("/api/addresses")
      .send({ country_code: "XYZ", fields: { line1: "123" } });
    expect(res.status).toBe(400);
    expect(res.body.errors.country_code).toMatch(/Unsupported country/);
  });

  it("returns 400 with field-level errors for invalid USA address", async () => {
    const res = await request(app)
      .post("/api/addresses")
      .send({
        country_code: "USA",
        fields: { line1: "", city: "", state: "TX", zip: "bad" },
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.line1).toBeDefined();
    expect(res.body.errors.city).toBeDefined();
    expect(res.body.errors.zip).toBeDefined();
  });

  it("returns 201 and persists a valid USA address", async () => {
    const res = await request(app)
      .post("/api/addresses")
      .send({
        country_code: "USA",
        fields: {
          line1: "1 Infinite Loop",
          line2: "",
          city: "Cupertino",
          state: "CA",
          zip: "95014",
        },
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.country_code).toBe("USA");
    expect(res.body.data.fields.line1).toBe("1 Infinite Loop");
    expect(res.body.data.created_at).toBeDefined();
  });

  it("returns 201 and persists a valid AUS address", async () => {
    const res = await request(app)
      .post("/api/addresses")
      .send({
        country_code: "AUS",
        fields: {
          line1: "10 Collins St",
          line2: "",
          suburb: "Melbourne",
          state: "VIC",
          postcode: "3000",
        },
      });
    expect(res.status).toBe(201);
    expect(res.body.data.country_code).toBe("AUS");
    expect(res.body.data.fields.suburb).toBe("Melbourne");
  });

  it("returns 201 and persists a valid IDN address", async () => {
    const res = await request(app)
      .post("/api/addresses")
      .send({
        country_code: "IDN",
        fields: {
          province: "Jakarta",
          city: "Jakarta Pusat",
          district: "Gambir",
          village: "",
          postal_code: "10110",
          street: "Jl. Medan Merdeka Utara No.1",
        },
      });
    expect(res.status).toBe(201);
    expect(res.body.data.fields.province).toBe("Jakarta");
  });
});

// ─── GET /api/addresses ───────────────────────────────────────────────────────
describe("GET /api/addresses", () => {
  it("returns a paginated list with success true", async () => {
    const res = await request(app).get("/api/addresses");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(typeof res.body.pagination.total).toBe("number");
    expect(typeof res.body.pagination.hasNextPage).toBe("boolean");
  });

  it("filters by country query param", async () => {
    const res = await request(app).get("/api/addresses?country=AUS");
    expect(res.status).toBe(200);
    for (const addr of res.body.data) {
      expect(addr.country_code).toBe("AUS");
    }
  });

  it("respects limit and page params", async () => {
    const res = await request(app).get("/api/addresses?limit=1&page=1");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
    expect(res.body.pagination.limit).toBe(1);
    expect(res.body.pagination.page).toBe(1);
  });

  it("clamps limit to a maximum of 100", async () => {
    const res = await request(app).get("/api/addresses?limit=9999");
    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(100);
  });

  it("returns fields as parsed objects, not raw JSON strings", async () => {
    const res = await request(app).get("/api/addresses");
    expect(res.status).toBe(200);
    for (const addr of res.body.data) {
      expect(typeof addr.fields).toBe("object");
    }
  });
});
