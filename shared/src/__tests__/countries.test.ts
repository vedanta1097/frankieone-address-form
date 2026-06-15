import { describe, it, expect } from "vitest";
import { COUNTRIES, type CountryConfig } from "../countries";

const COUNTRY_CODES = Object.keys(COUNTRIES);

describe("COUNTRIES config", () => {
  it("exports at least one country", () => {
    expect(COUNTRY_CODES.length).toBeGreaterThan(0);
  });

  it("includes USA, AUS, and IDN", () => {
    expect(COUNTRIES["USA"]).toBeDefined();
    expect(COUNTRIES["AUS"]).toBeDefined();
    expect(COUNTRIES["IDN"]).toBeDefined();
  });

  describe.each(COUNTRY_CODES)("country %s", (code) => {
    let config: CountryConfig;

    it("has matching code property", () => {
      config = COUNTRIES[code];
      expect(config.code).toBe(code);
    });

    it("has a non-empty name", () => {
      config = COUNTRIES[code];
      expect(config.name.length).toBeGreaterThan(0);
    });

    it("has a flag", () => {
      config = COUNTRIES[code];
      expect(config.flag.length).toBeGreaterThan(0);
    });

    it("has at least one field", () => {
      config = COUNTRIES[code];
      expect(config.fields.length).toBeGreaterThan(0);
    });

    it("has at least one required field", () => {
      config = COUNTRIES[code];
      const hasRequired = config.fields.some((f) => f.required);
      expect(hasRequired).toBe(true);
    });

    it("select fields have non-empty options", () => {
      config = COUNTRIES[code];
      for (const field of config.fields) {
        if (field.type === "select") {
          expect(field.options).toBeDefined();
          expect(field.options!.length).toBeGreaterThan(0);
        }
      }
    });

    it("field names are unique within the country", () => {
      config = COUNTRIES[code];
      const names = config.fields.map((f) => f.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    });
  });
});
