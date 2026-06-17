import { apiJson } from "@/lib/api";

export type GeocodeResult = {
  lat: number;
  lng: number;
  address: string;
  city: string;
  full_name: string;
};

export async function geocodeAddress(q: string): Promise<GeocodeResult[]> {
  const data = await apiJson<{ results: GeocodeResult[] }>(
    `/api/v1/geo/geocode/?q=${encodeURIComponent(q)}`,
  );
  return data.results ?? [];
}

export async function reverseGeocodeAddress(lat: number, lng: number): Promise<GeocodeResult | null> {
  try {
    return await apiJson<GeocodeResult>(
      `/api/v1/geo/reverse/?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
    );
  } catch {
    return null;
  }
}
