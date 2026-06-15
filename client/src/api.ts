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
export interface PaginatedAddressResponse {
  data: AddressRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
}

export async function fetchAddresses({
  page = 1,
  limit = 10,
  country,
}: {
  page?: number;
  limit?: number;
  country?: string;
} = {}): Promise<PaginatedAddressResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (country) params.set("country", country);
  const res = await fetch(`${BASE}/addresses?${params}`);
  const json = (await res.json()) as ApiResponse<AddressRecord[]> & {
    pagination?: PaginatedAddressResponse["pagination"];
  };
  if (!json.success) throw new Error("Failed to load addresses");
  return {
    data: json.data ?? [],
    pagination: json.pagination ?? {
      page,
      limit,
      total: 0,
      hasNextPage: false,
    },
  };
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
