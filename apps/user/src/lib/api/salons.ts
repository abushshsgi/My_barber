import { apiJson } from "./client";
import { apiList } from "./list-utils";
import type { ApiSalonDetail, ApiSalonList, ApiSalonRatingSummary, ApiSalonStaff, ApiService } from "./types";
import type { ApiNearbySalon } from "./types";

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function fetchSalons(params?: {
  ids?: string;
  region?: string;
  scope?: string;
  audience?: string;
  business_kind?: string;
}): Promise<ApiSalonList[]> {
  return apiList<ApiSalonList>(`/api/v1/salons/${qs(params ?? {})}`);
}

export async function fetchSalon(id: string | number): Promise<ApiSalonDetail> {
  return apiJson<ApiSalonDetail>(`/api/v1/salons/${id}/`);
}

export async function fetchSalonStaff(
  id: string | number,
  params?: { audience?: string },
): Promise<ApiSalonStaff[]> {
  return apiList<ApiSalonStaff>(`/api/v1/salons/${id}/staff/${qs(params ?? {})}`);
}

export async function fetchSalonBarberServices(
  salonId: string | number,
  barberId: string | number,
): Promise<ApiService[]> {
  return apiJson<ApiService[]>(
    `/api/v1/salons/${salonId}/barber-services/${qs({ barber: barberId })}`,
  );
}

export async function fetchSalonsNearby(
  lat: number,
  lng: number,
  radiusKm = 15,
): Promise<ApiNearbySalon[]> {
  return apiJson<ApiNearbySalon[]>(
    `/api/v1/salons/nearby/${qs({ lat, lng, radius_km: radiusKm })}`,
  );
}

export async function searchSalons(
  q: string,
  params?: { region?: string; scope?: string },
): Promise<ApiSalonList[]> {
  return apiList<ApiSalonList>(
    `/api/v1/salons/search/${qs({ q, region: params?.region, scope: params?.scope })}`,
  );
}

export async function fetchSalonPortfolio(
  salonId: string | number,
): Promise<{ image: string | null; booking_id: number }[]> {
  return apiJson(`/api/v1/salons/${salonId}/portfolio/`);
}

export async function fetchSalonRatingSummary(
  id: string | number,
  lang?: string,
): Promise<ApiSalonRatingSummary> {
  const q = qs({ lang });
  const suffix = q ? q.replace(/^\?/, "/?") : "/";
  return apiJson<ApiSalonRatingSummary>(`/api/v1/salons/${id}/rating-summary${suffix}`);
}
