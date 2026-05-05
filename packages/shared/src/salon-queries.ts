import { apiFetch, formatApiError } from "./api";
import { mapSalonListApi, type SalonListApi } from "./mapSalon";
import type { Salon } from "./types";

export async function fetchSalons(): Promise<Salon[]> {
  const res = await apiFetch("/api/v1/salons/");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = formatApiError(body, "");
    const hint =
      res.status === 500
        ? " Backend-da «python manage.py migrate» (masalan, Railway Release Command) bajarilganini tekshiring."
        : "";
    throw new Error(
      (detail ? `${detail} ` : "") +
        `(HTTP ${res.status}). Salonlar yuklanmadi.${hint}`
    );
  }
  const j = (await res.json()) as { results?: SalonListApi[] } | SalonListApi[];
  const raw = Array.isArray(j) ? j : j.results || [];
  return raw.map((r) => mapSalonListApi(r));
}

/** Joriy foydalanuvchining salonlari (egasi yoki faol a’zo). */
export async function fetchMySalons(): Promise<SalonListApi[]> {
  const res = await apiFetch("/api/v1/salons/mine/");
  if (!res.ok) return [];
  const j = (await res.json()) as SalonListApi[] | { results?: SalonListApi[] };
  return Array.isArray(j) ? j : j.results || [];
}
