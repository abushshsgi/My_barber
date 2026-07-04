import type { Audience, Category, Salon } from "@/lib/mock-data";
import type { AudienceFilter } from "@/hooks/use-audience";

export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km <= 0) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

/** Xaritada ko'rsatish uchun to'g'ri salon koordinatalari. */
export function hasValidMapCoords(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return false;
  return true;
}

const WOMEN_HINT =
  /beauty|spa|glow|nail|kosmet|manik|pedik|ayol|salon|studio|lash|brow|makeup|parfyum/i;
const MEN_HINT = /barber|barbershop|soqol|erkak|fade|cut|trim|baraka|usta/i;

/** API audience bo'lmasa — nom va kategoriyadan taxmin. */
export function inferSalonAudience(salon: Salon): Audience {
  if (salon.audience === "men" || salon.audience === "women") return salon.audience;
  if (salon.category === "beauty" || salon.category === "nails") {
    return "women";
  }
  if (salon.category === "barber") return "men";
  const text = `${salon.name} ${salon.about} ${salon.address}`.toLowerCase();
  if (WOMEN_HINT.test(text)) return "women";
  if (MEN_HINT.test(text)) return "men";
  return "unisex";
}

/** Profil auditoriyasiga mos salon (xarita avtomatik filter). */
export function salonMatchesMapAudience(salon: Salon, filter: AudienceFilter): boolean {
  if (filter === "all") return true;
  return inferSalonAudience(salon) === filter;
}

export function audienceCategoryLabel(filter: AudienceFilter): Category | null {
  if (filter === "men") return "barber";
  if (filter === "women") return "beauty";
  return null;
}
