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

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

export interface PlacePrediction {
  place_id: string;
  description: string;
}

export interface PlaceDetailsResult {
  fields: Record<string, string>;
  formatted_address: string;
}
