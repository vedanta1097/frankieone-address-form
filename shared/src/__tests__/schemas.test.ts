import { describe, it, expect } from "vitest";
import { buildSchema, SCHEMAS } from "../schemas";

describe("buildSchema", () => {
  it("throws on unknown country code", () => {
    expect(() => buildSchema("INVALID")).toThrow(
      "Unknown country code: INVALID",
    );
  });

  describe("USA", () => {
    const schema = buildSchema("USA");

    it("accepts a valid address", () => {
      const result = schema.safeParse({
        line1: "123 Main St",
        line2: "",
        city: "Austin",
        state: "TX",
        zip: "78701",
      });
      expect(result.success).toBe(true);
    });

    it("accepts optional line2 as empty string", () => {
      const result = schema.safeParse({
        line1: "1 Broadway",
        line2: "",
        city: "New York",
        state: "NY",
        zip: "10004",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing required line1", () => {
      const result = schema.safeParse({
        line1: "",
        city: "Austin",
        state: "TX",
        zip: "78701",
      });
      expect(result.success).toBe(false);
      const errors = result.error!.flatten().fieldErrors;
      expect(errors.line1).toBeDefined();
    });

    it("rejects zip code that is not 5 digits", () => {
      const result = schema.safeParse({
        line1: "123 Main St",
        city: "Austin",
        state: "TX",
        zip: "1234",
      });
      expect(result.success).toBe(false);
      const errors = result.error!.flatten().fieldErrors;
      expect(errors.zip).toBeDefined();
    });

    it("rejects zip code with letters", () => {
      const result = schema.safeParse({
        line1: "123 Main St",
        city: "Austin",
        state: "TX",
        zip: "7870A",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing city", () => {
      const result = schema.safeParse({
        line1: "123 Main St",
        city: "",
        state: "TX",
        zip: "78701",
      });
      expect(result.success).toBe(false);
      const errors = result.error!.flatten().fieldErrors;
      expect(errors.city).toBeDefined();
    });
  });

  describe("AUS", () => {
    const schema = buildSchema("AUS");

    it("accepts a valid address", () => {
      const result = schema.safeParse({
        line1: "10 Collins St",
        line2: "",
        suburb: "Melbourne",
        state: "VIC",
        postcode: "3000",
      });
      expect(result.success).toBe(true);
    });

    it("rejects postcode that is not 4 digits", () => {
      const result = schema.safeParse({
        line1: "10 Collins St",
        suburb: "Melbourne",
        state: "VIC",
        postcode: "300",
      });
      expect(result.success).toBe(false);
      const errors = result.error!.flatten().fieldErrors;
      expect(errors.postcode).toBeDefined();
    });

    it("rejects missing suburb", () => {
      const result = schema.safeParse({
        line1: "10 Collins St",
        suburb: "",
        state: "VIC",
        postcode: "3000",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("IDN", () => {
    const schema = buildSchema("IDN");

    it("accepts a valid address", () => {
      const result = schema.safeParse({
        province: "Jakarta",
        city: "Jakarta Pusat",
        district: "Gambir",
        village: "",
        postal_code: "10110",
        street: "Jl. Medan Merdeka Utara No.1",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing street", () => {
      const result = schema.safeParse({
        province: "Bali",
        city: "Denpasar",
        district: "Denpasar Selatan",
        village: "",
        postal_code: "80224",
        street: "",
      });
      expect(result.success).toBe(false);
      const errors = result.error!.flatten().fieldErrors;
      expect(errors.street).toBeDefined();
    });

    it("rejects postal_code that is not 5 digits", () => {
      const result = schema.safeParse({
        province: "Bali",
        city: "Denpasar",
        district: "Denpasar Selatan",
        village: "",
        postal_code: "1234",
        street: "Jl. Sunset Road",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("SCHEMAS", () => {
  it("pre-builds schemas for all countries", () => {
    expect(SCHEMAS["USA"]).toBeDefined();
    expect(SCHEMAS["AUS"]).toBeDefined();
    expect(SCHEMAS["IDN"]).toBeDefined();
  });

  it("pre-built schemas work identically to buildSchema", () => {
    const payload = {
      line1: "1 Infinite Loop",
      city: "Cupertino",
      state: "CA",
      zip: "95014",
    };
    const fromBuild = buildSchema("USA").safeParse(payload);
    const fromCache = SCHEMAS["USA"].safeParse(payload);
    expect(fromBuild.success).toBe(fromCache.success);
  });
});
