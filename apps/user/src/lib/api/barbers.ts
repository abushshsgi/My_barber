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
): Promise<unknown[]> {
  return apiJson(`/api/v1/barbers/nearby/${qs({ lat, lng, radius_km: radiusKm })}`);
}

export async function findBarbers(q: string): Promise<unknown[]> {
  return apiJson(`/api/v1/barbers/find/${qs({ q })}`);
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
