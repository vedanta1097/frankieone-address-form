import type {
  AddressPayload,
  AddressRecord,
  ApiResponse,
  PlacePrediction,
  PlaceDetailsResult,
} from "shared";

const BASE = "/api";

async function request<T>(path: string): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`);
  return res.json() as Promise<ApiResponse<T>>;
}

// Addresses
export async function fetchAddresses(
  country?: string,
): Promise<AddressRecord[]> {
  const qs = country ? `?country=${country}` : "";
  const res = await request<AddressRecord[]>(`/addresses${qs}`);
  if (!res.success) throw new Error("Failed to load addresses");
  return res.data ?? [];
}

export async function saveAddress(
  payload: AddressPayload,
): Promise<AddressRecord> {
  const res = await fetch(`${BASE}/addresses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as ApiResponse<AddressRecord>;
  if (!data.success) {
    // Attach validation errors to the thrown error for the form to read
    const err = Object.assign(new Error("Validation failed"), {
      errors: data.errors,
    });
    throw err;
  }
  return data.data!;
}

// Places autocomplete (proxied through backend — API key stays server-side)
export async function fetchAutocompleteSuggestions(
  input: string,
  country: string,
): Promise<PlacePrediction[]> {
  const res = await request<{ predictions: PlacePrediction[] }>(
    `/places/autocomplete?input=${encodeURIComponent(input)}&country=${country}`,
  );
  return res.data?.predictions ?? [];
}

export async function fetchPlaceDetails(
  place_id: string,
  country: string,
): Promise<PlaceDetailsResult> {
  const res = await request<PlaceDetailsResult>(
    `/places/details?place_id=${encodeURIComponent(place_id)}&country=${country}`,
  );
  return res.data ?? { fields: {}, formatted_address: "" };
}
