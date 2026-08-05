import { apiJson } from "./client";

export type GeocodeResult = {
  lat: number;
  lng: number;
  address: string;
  city: string;
  full_name: string;
};

export type LocationValidation = {
  region_from_gps: string;
  region_from_gps_label: string;
  city_label: string;
  in_uzbekistan: boolean;
};

export async function geocodeAddress(q: string): Promise<GeocodeResult[]> {
  try {
    const data = await apiJson<{ results: GeocodeResult[] }>(
      `/api/v1/geo/geocode/?q=${encodeURIComponent(q)}`
    );
    return data.results ?? [];
  } catch {
    return [];
  }
}

export async function reverseGeocodeAddress(
  lat: number,
  lng: number
): Promise<GeocodeResult | null> {
  try {
    return await apiJson<GeocodeResult>(
      `/api/v1/geo/reverse/?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
    );
  } catch {
    return null;
  }
}

export async function validateLocation(
  lat: number,
  lng: number
): Promise<LocationValidation | null> {
  try {
    return await apiJson<LocationValidation>(
      `/api/v1/geo/validate/?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
    );
  } catch {
    return null;
  }
}
