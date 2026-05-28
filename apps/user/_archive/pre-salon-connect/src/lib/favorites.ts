import { apiFetch, getAccessToken } from "@/lib/api";

const FAVORITES_KEY = "mybarber_user_favorite_salons";

export function getFavoriteSalonIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function isFavoriteSalon(id: string | number): boolean {
  return getFavoriteSalonIds().includes(String(id));
}

export function toggleFavoriteSalon(id: string | number): boolean {
  if (typeof window === "undefined") return false;
  const key = String(id);
  const current = new Set(getFavoriteSalonIds());
  if (current.has(key)) {
    current.delete(key);
  } else {
    current.add(key);
  }
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(current)));
  return current.has(key);
}

function writeFavoriteSalonIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

export async function fetchFavoriteSalonIds(): Promise<string[]> {
  if (!getAccessToken()) return getFavoriteSalonIds();
  const res = await apiFetch("/api/v1/favorites/salons/");
  if (!res.ok) return getFavoriteSalonIds();
  const body = (await res.json()) as { results?: Array<{ salon: number | string }> };
  const ids = (body.results || []).map((row) => String(row.salon));
  writeFavoriteSalonIds(ids);
  return ids;
}

export async function fetchFavoriteSalonCount(): Promise<number> {
  return (await fetchFavoriteSalonIds()).length;
}

export async function setFavoriteSalon(id: string | number, favorite: boolean): Promise<boolean> {
  const salonId = String(id);
  if (!getAccessToken()) {
    const current = isFavoriteSalon(salonId);
    return current === favorite ? current : toggleFavoriteSalon(salonId);
  }
  const res = await apiFetch(
    favorite ? "/api/v1/favorites/salons/" : `/api/v1/favorites/salons/${salonId}/`,
    {
      method: favorite ? "POST" : "DELETE",
      body: favorite ? JSON.stringify({ salon: Number(salonId) }) : undefined,
    },
  );
  if (!res.ok) {
    const current = isFavoriteSalon(salonId);
    return current === favorite ? current : toggleFavoriteSalon(salonId);
  }
  const ids = new Set(getFavoriteSalonIds());
  if (favorite) ids.add(salonId);
  else ids.delete(salonId);
  writeFavoriteSalonIds(Array.from(ids));
  return favorite;
}
