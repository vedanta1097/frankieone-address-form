import { z } from "zod";
import { COUNTRIES, FieldConfig } from "./countries";

function fieldToZod(field: FieldConfig): z.ZodTypeAny {
  if (field.type === "select" && field.options && field.options.length > 0) {
    const schema = z.enum(field.options as [string, ...string[]]);
    return field.required ? schema : schema.optional();
  }
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
  // Optional: any string (including empty) is valid
  return z.string();
}

export function buildSchema(
  countryCode: string,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const config = COUNTRIES[countryCode];
  if (!config) throw new Error(`Unknown country code: ${countryCode}`);

  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of config.fields) {
    shape[field.name] = fieldToZod(field);
  }
  return z.object(shape);
}

/** Pre-built schemas for all supported countries */
export const SCHEMAS = Object.fromEntries(
  Object.keys(COUNTRIES).map((code) => [code, buildSchema(code)]),
) as Record<string, ReturnType<typeof buildSchema>>;
