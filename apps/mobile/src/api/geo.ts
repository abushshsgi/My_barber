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
  const data = await apiJson<{ results: GeocodeResult[] }>(
    `/api/v1/geo/geocode/?q=${encodeURIComponent(q)}`,
  );
  return Array.isArray(data.results) ? data.results : [];
}

/** Qidiruv natijasida ko'cha / joy nomi. */
export function geocodeResultTitle(item: GeocodeResult): string {
  const address = (item.address || "").trim();
  if (address) return address.split(",")[0]?.trim() || address;
  const full = (item.full_name || "").trim();
  if (full) return full.split(",")[0]?.trim() || full;
  return (item.city || "").trim() || "Manzil";
}

export function geocodeResultSubtitle(item: GeocodeResult): string {
  const full = (item.full_name || "").trim();
  const title = geocodeResultTitle(item);
  if (full && full !== title) return full;
  return (item.city || "").trim();
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
