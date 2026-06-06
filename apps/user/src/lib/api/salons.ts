import { apiJson } from "./client";
import { apiList } from "./list-utils";
import type { ApiSalonDetail, ApiSalonList, ApiSalonStaff } from "./types";
import type { ApiNearbySalon } from "./types";

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function fetchSalons(params?: { ids?: string; region?: string }): Promise<ApiSalonList[]> {
  return apiList<ApiSalonList>(`/api/v1/salons/${qs(params ?? {})}`);
}

export async function fetchSalon(id: string | number): Promise<ApiSalonDetail> {
  return apiJson<ApiSalonDetail>(`/api/v1/salons/${id}/`);
}

export async function fetchSalonStaff(id: string | number): Promise<ApiSalonStaff[]> {
  return apiJson<ApiSalonStaff[]>(`/api/v1/salons/${id}/staff/`);
}

export async function fetchSalonsNearby(
  lat: number,
  lng: number,
  radiusKm = 15,
): Promise<ApiNearbySalon[]> {
  return apiJson<ApiNearbySalon[]>(
    `/api/v1/salons/nearby/${qs({ lat, lng, radius: radiusKm })}`,
  );
}

export async function searchSalons(q: string): Promise<ApiSalonList[]> {
  return apiList<ApiSalonList>(`/api/v1/salons/search/${qs({ q })}`);
}

export async function fetchSalonPortfolio(
  salonId: string | number,
): Promise<{ image: string | null; booking_id: number }[]> {
  return apiJson(`/api/v1/salons/${salonId}/portfolio/`);
}
