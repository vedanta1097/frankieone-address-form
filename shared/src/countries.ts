export type FieldType = "text" | "select";

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  pattern?: string;
  patternMessage?: string;
}

export interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  fields: FieldConfig[];
}

export const COUNTRIES: Record<string, CountryConfig> = {
  USA: {
    code: "USA",
    name: "United States",
    flag: "🇺🇸",
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
        patternMessage: "Must be exactly 5 digits",
      },
    ],
  },

  AUS: {
    code: "AUS",
    name: "Australia",
    flag: "🇦🇺",
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
        patternMessage: "Must be exactly 4 digits",
      },
    ],
  },

  IDN: {
    code: "IDN",
    name: "Indonesia",
    flag: "🇮🇩",
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
        patternMessage: "Must be exactly 5 digits",
      },
      { name: "street", label: "Street Address", type: "text", required: true },
    ],
  },
};
