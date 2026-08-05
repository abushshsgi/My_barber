import { apiJson, apiList, qs } from "./client";
import type { ApiBarberPublic, ApiNearbySalon, ApiSalonList } from "./types";

export async function fetchSalons(params?: {
  region?: string;
  scope?: string;
  page_size?: number;
}): Promise<ApiSalonList[]> {
  return apiList<ApiSalonList>(`/api/v1/salons/${qs(params ?? {})}`);
}

export async function fetchSalonsNearby(
  lat: number,
  lng: number,
  radiusKm = 40,
): Promise<ApiNearbySalon[]> {
  return apiJson<ApiNearbySalon[]>(
    `/api/v1/salons/nearby/${qs({ lat, lng, radius_km: radiusKm })}`,
  );
}

export async function fetchBarbers(params?: {
  region?: string;
  scope?: string;
  page_size?: number;
}): Promise<ApiBarberPublic[]> {
  return apiList<ApiBarberPublic>(`/api/v1/barbers/${qs(params ?? {})}`);
}

export async function fetchBarbersNearby(
  lat: number,
  lng: number,
  radiusKm = 40,
): Promise<ApiBarberPublic[]> {
  return apiJson<ApiBarberPublic[]>(
    `/api/v1/barbers/nearby/${qs({ lat, lng, radius_km: radiusKm })}`,
  );
}
