import { apiFetch, apiJson, formatApiError } from "./api";
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

/** Salon qidiruv — barber mavjud salonga qo‘shilish uchun (backend: GET /salons/search). */
export type SalonSearchHit = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

export async function searchSalonsForJoin(q: string): Promise<SalonSearchHit[]> {
  const trimmed = q.trim();
  if (trimmed.length < 1) return [];
  const res = await apiFetch(`/api/v1/salons/search/?q=${encodeURIComponent(trimmed)}`);
  if (!res.ok) throw new Error("Qidiruv muvaffaqiyatsiz");
  return res.json() as Promise<SalonSearchHit[]>;
}

export async function joinSalon(payload: {
  salon_id: number;
  latitude: number;
  longitude: number;
}): Promise<{ detail: string; membership_id: number; salon_id: number }> {
  return apiJson("/api/v1/salons/join/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Joriy foydalanuvchining salonlari (egasi yoki faol a’zo). */
export async function fetchMySalons(): Promise<SalonListApi[]> {
  const res = await apiFetch("/api/v1/salons/mine/");
  if (!res.ok) return [];
  const j = (await res.json()) as SalonListApi[] | { results?: SalonListApi[] };
  return Array.isArray(j) ? j : j.results || [];
}
