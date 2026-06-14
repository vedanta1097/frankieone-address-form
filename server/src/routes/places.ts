import { Router, Request, Response } from "express";

const router = Router();

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

function getComponent(
  components: AddressComponent[],
  ...types: string[]
): string {
  return (
    components.find((c) => types.some((t) => c.types.includes(t)))?.long_name ??
    ""
  );
}

function getShortComponent(
  components: AddressComponent[],
  ...types: string[]
): string {
  return (
    components.find((c) => types.some((t) => c.types.includes(t)))
      ?.short_name ?? ""
  );
}

function parseComponents(
  components: AddressComponent[],
  countryCode: string,
): Record<string, string> {
  const streetNumber = getComponent(components, "street_number");
  const route = getComponent(components, "route");
  const line1 = [streetNumber, route].filter(Boolean).join(" ");

  if (countryCode === "USA") {
    return {
      line1,
      city: getComponent(
        components,
        "locality",
        "sublocality_level_1",
        "administrative_area_level_3",
      ),
      state: getShortComponent(components, "administrative_area_level_1"),
      zip: getComponent(components, "postal_code"),
    };
  }

  if (countryCode === "AUS") {
    return {
      line1,
      suburb: getComponent(components, "locality", "sublocality"),
      state: getShortComponent(components, "administrative_area_level_1"),
      postcode: getComponent(components, "postal_code"),
    };
  }

  if (countryCode === "IDN") {
    return {
      province: getComponent(components, "administrative_area_level_1"),
      city: getComponent(components, "locality", "administrative_area_level_2"),
      district: getComponent(
        components,
        "administrative_area_level_3",
        "sublocality_level_1",
      ),
      village: getComponent(components, "administrative_area_level_2"),
      postal_code: getComponent(components, "postal_code"),
      street: line1,
    };
  }

  return { line1 };
}

// GET /api/places/autocomplete?input=...&country=...
router.get("/autocomplete", async (req: Request, res: Response) => {
  const { input, country } = req.query;

  if (!GOOGLE_API_KEY) {
    res.json({ success: true, data: { predictions: [] } });
    return;
  }

  if (!input || typeof input !== "string" || input.length < 3) {
    res.json({ success: true, data: { predictions: [] } });
    return;
  }

  // Map country code to ISO 3166-1 alpha-2 for the Places API
  const countryMap: Record<string, string> = {
    USA: "us",
    AUS: "au",
    IDN: "id",
  };
  const countryRestrict =
    country && typeof country === "string" ? countryMap[country] : undefined;

  const params = new URLSearchParams({
    input,
    key: GOOGLE_API_KEY,
    types: "address",
    ...(countryRestrict ? { components: `country:${countryRestrict}` } : {}),
  });

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`,
    );
    const data = (await response.json()) as {
      status: string;
      predictions: { place_id: string; description: string }[];
    };

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      res.json({ success: true, data: { predictions: [] } });
      return;
    }

    const predictions = (data.predictions ?? []).map(
      ({ place_id, description }) => ({
        place_id,
        description,
      }),
    );
    res.json({ success: true, data: { predictions } });
  } catch {
    res.json({ success: true, data: { predictions: [] } });
  }
});

// GET /api/places/details?place_id=...&country=...
router.get("/details", async (req: Request, res: Response) => {
  const { place_id, country } = req.query;

  if (!GOOGLE_API_KEY || !place_id || typeof place_id !== "string") {
    res.json({ success: true, data: { fields: {}, formatted_address: "" } });
    return;
  }

  const params = new URLSearchParams({
    place_id,
    fields: "address_components,formatted_address",
    key: GOOGLE_API_KEY,
  });

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
    );
    const data = (await response.json()) as {
      status: string;
      result?: {
        address_components: AddressComponent[];
        formatted_address: string;
      };
    };

    if (data.status !== "OK" || !data.result) {
      res.json({ success: true, data: { fields: {}, formatted_address: "" } });
      return;
    }

    const countryCode = typeof country === "string" ? country : "USA";
    const fields = parseComponents(data.result.address_components, countryCode);

    res.json({
      success: true,
      data: { fields, formatted_address: data.result.formatted_address },
    });
  } catch {
    res.json({ success: true, data: { fields: {}, formatted_address: "" } });
  }
});

export default router;
