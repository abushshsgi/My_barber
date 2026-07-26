import { apiJson } from "./client";
import type { ApiAvailabilityMonth, ApiAvailabilitySlot, ApiBarberPublic } from "./types";

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function fetchBarberByBarberId(barberId: string | number): Promise<ApiBarberPublic> {
  return apiJson<ApiBarberPublic>(`/api/v1/barbers/by-barber-id/${qs({ id: barberId })}`);
}

export async function fetchBarber(id: string | number): Promise<ApiBarberPublic> {
  return apiJson<ApiBarberPublic>(`/api/v1/barbers/${id}/`);
}

export async function fetchBarbersNearby(
  lat: number,
  lng: number,
  radiusKm = 15,
  params?: { audience?: string },
): Promise<import("./types").ApiBarberPublic[]> {
  return apiJson(
    `/api/v1/barbers/nearby/${qs({ lat, lng, radius_km: radiusKm, audience: params?.audience })}`,
  );
}

export async function findBarbers(
  q: string,
  params?: { region?: string; scope?: string },
): Promise<import("./types").ApiBarberPublic[]> {
  return apiJson(
    `/api/v1/barbers/find/${qs({ q, region: params?.region, scope: params?.scope })}`,
  );
}

export async function fetchBarbersList(params?: {
  region?: string;
  scope?: string;
  audience?: string;
}): Promise<import("./types").ApiBarberPublic[]> {
  const body = await apiJson<
    import("./types").ApiBarberPublic[] | import("./types").Paginated<import("./types").ApiBarberPublic>
  >(`/api/v1/barbers/${qs({ region: params?.region, scope: params?.scope, audience: params?.audience })}`);
  if (Array.isArray(body)) return body;
  return Array.isArray(body.results) ? body.results : [];
}

export async function fetchIndependentAvailability(params: {
  barber: number;
  date: string;
  barber_service_ids: string;
}): Promise<{ slots: ApiAvailabilitySlot[]; closed_reason?: string; detail?: string }> {
  return apiJson(`/api/v1/barbers/availability/${qs(params)}`);
}

export async function fetchIndependentAvailabilityMonth(params: {
  barber: number;
  year: number;
  month: number;
  barber_service_ids?: string;
}): Promise<ApiAvailabilityMonth> {
  return apiJson(`/api/v1/barbers/availability/month/${qs(params)}`);
}
