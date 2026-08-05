import { resolveMediaUrl } from "../api/media";
import type {
  ApiBarberPublic,
  ApiNearbySalon,
  ApiSalonList,
  HomeListing,
} from "../api/types";

export const CATEGORY_LABELS = {
  all: "Barchasi",
  barber: "Barber",
  beauty: "Go'zallik",
  nails: "Manikyur",
} as const;

function businessKindLabel(kind?: string): string {
  if (kind === "beauty_salon") return CATEGORY_LABELS.beauty;
  return CATEGORY_LABELS.barber;
}

export function mapSalon(
  salon: ApiSalonList,
  distanceKm = 0,
  imageWidth?: number,
): HomeListing {
  const gallery = salon.images?.length
    ? resolveMediaUrl(salon.images[0]?.image, { width: imageWidth })
    : null;

  return {
    id: String(salon.id),
    title: salon.name,
    coverUrl:
      resolveMediaUrl(salon.cover_image, { width: imageWidth }) || gallery,
    categoryLabel: businessKindLabel(salon.business_kind),
    distanceKm,
    address: salon.address || "",
    priceFrom: salon.price_from ?? 0,
    favoriteId: String(salon.id),
  };
}

export function mapNearbySalon(row: ApiNearbySalon, imageWidth?: number): HomeListing {
  return mapSalon(row.salon, row.distance_km ?? 0, imageWidth);
}

export function mapBarber(barber: ApiBarberPublic, imageWidth?: number): HomeListing {
  const services = barber.active_services?.length
    ? barber.active_services
    : barber.services ?? [];
  const priceFrom = services.reduce((min, s) => {
    if (!s.price || s.price <= 0) return min;
    return min === 0 ? s.price : Math.min(min, s.price);
  }, 0);

  const cover =
    resolveMediaUrl(barber.avatar, { width: imageWidth }) ||
    resolveMediaUrl(barber.work_photos?.[0]?.image, { width: imageWidth }) ||
    null;

  return {
    id: `barber-${barber.id}`,
    title: barber.name,
    coverUrl: cover,
    categoryLabel: CATEGORY_LABELS.barber,
    distanceKm: barber.distance_km ?? 0,
    address: barber.salon_name || barber.location_text || barber.region || "",
    priceFrom,
  };
}

/** Reyting ≥ 4.8 — web `filterTopSalons` bilan mos. */
export function filterTopSalons(salons: HomeListing[], source: ApiSalonList[]): HomeListing[] {
  const byId = new Map(source.map((s) => [String(s.id), s]));
  const top = salons.filter((item) => {
    const raw = byId.get(item.id);
    return (raw?.rating_avg ?? 0) >= 4.8;
  });
  return (top.length > 0 ? top : salons).slice(0, 6);
}
