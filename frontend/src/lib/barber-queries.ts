import { apiFetch, formatApiError } from "./api";

export type BarberServiceApi = {
  id: number;
  name: string;
  price: string;
  duration_minutes: number;
  is_active: boolean;
};

export type BarberListApi = {
  id: number; // BarberProfile id
  user_id: number;
  name: string;
  phone: string | null;
  location_text: string;
  latitude: string | null;
  longitude: string | null;
  avatar: string | null;
  active_services: BarberServiceApi[];
};

export async function fetchBarbers(): Promise<BarberListApi[]> {
  const res = await apiFetch("/api/v1/barbers/");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = formatApiError(body, "");
    const hint =
      res.status === 500
        ? " Backend-da migrate (Release Command) tekshiring."
        : "";
    throw new Error(
      (detail ? `${detail} ` : "") + `(HTTP ${res.status}). Barberlar yuklanmadi.${hint}`
    );
  }
  const j = (await res.json()) as { results?: BarberListApi[] } | BarberListApi[];
  return Array.isArray(j) ? j : j.results || [];
}

