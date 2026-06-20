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

const GEO_UNAVAILABLE: LocationValidation = {
  region_from_gps: "",
  region_from_gps_label: "",
  city_label: "",
  matches_selected: null,
  in_uzbekistan: true,
  salons_published: 0,
  has_coverage: false,
};

export async function geocodeAddress(q: string): Promise<GeocodeResult[]> {
  try {
    const data = await apiJson<{ results: GeocodeResult[] }>(
      `/api/v1/geo/geocode/?q=${encodeURIComponent(q)}`,
    );
    return data.results ?? [];
  } catch {
    return [];
  }
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
  try {
    return await apiJson<LocationValidation>(`/api/v1/geo/validate/?${params.toString()}`);
  } catch {
    return GEO_UNAVAILABLE;
  }
}

export async function submitLaunchInterest(payload: LaunchInterestPayload): Promise<void> {
  await apiJson("/api/v1/launch-interest/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
