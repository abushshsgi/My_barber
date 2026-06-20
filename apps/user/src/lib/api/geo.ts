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
  matches_selected: boolean | null;
  in_uzbekistan: boolean;
  salons_published: number;
  has_coverage: boolean;
};

export type LaunchInterestPayload = {
  region: string;
  latitude?: number | null;
  longitude?: number | null;
  city_label?: string;
  message?: string;
  source?: "onboarding" | "address" | "home";
};

export async function geocodeAddress(q: string): Promise<GeocodeResult[]> {
  const data = await apiJson<{ results: GeocodeResult[] }>(
    `/api/v1/geo/geocode/?q=${encodeURIComponent(q)}`,
  );
  return data.results ?? [];
}

export async function reverseGeocodeAddress(
  lat: number,
  lng: number,
): Promise<GeocodeResult | null> {
  try {
    return await apiJson<GeocodeResult>(
      `/api/v1/geo/reverse/?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
    );
  } catch {
    return null;
  }
}

export async function validateLocation(
  lat: number,
  lng: number,
  region?: string,
): Promise<LocationValidation> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  if (region) params.set("region", region);
  return apiJson<LocationValidation>(`/api/v1/geo/validate/?${params.toString()}`);
}

export async function submitLaunchInterest(payload: LaunchInterestPayload): Promise<void> {
  await apiJson("/api/v1/launch-interest/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
