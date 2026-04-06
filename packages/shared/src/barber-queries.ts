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
  barber_id: number;
  name: string;
  phone: string | null;
  region?: string;
  location_text: string;
  latitude: string | null;
  longitude: string | null;
  avatar: string | null;
  avg_rating?: number | null;
  review_count?: number | null;
  active_services: BarberServiceApi[];
};

export type BarberExploreFilters = {
  min_price?: string;
  max_price?: string;
  min_rating?: string;
  region?: string;
  service_q?: string;
  available_date?: string;
  work_mode?: "independent";
};

function buildBarberQuery(filters?: BarberExploreFilters): string {
  if (!filters) return "";
  const p = new URLSearchParams();
  if (filters.min_price) p.set("min_price", filters.min_price);
  if (filters.max_price) p.set("max_price", filters.max_price);
  if (filters.min_rating) p.set("min_rating", filters.min_rating);
  if (filters.region) p.set("region", filters.region);
  if (filters.service_q) p.set("service_q", filters.service_q);
  if (filters.available_date) p.set("available_date", filters.available_date);
  if (filters.work_mode) p.set("work_mode", filters.work_mode);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export async function fetchBarbers(filters?: BarberExploreFilters): Promise<BarberListApi[]> {
  const res = await apiFetch(`/api/v1/barbers/${buildBarberQuery(filters)}`);
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

