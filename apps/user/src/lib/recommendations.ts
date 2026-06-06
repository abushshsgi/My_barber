import type { Salon } from "@/lib/mock-data";

export type RecommendContext = {
  lat?: number | null;
  lng?: number | null;
  region?: string | null;
};

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function recommendScore(salon: Salon, ctx: RecommendContext): number {
  let score = (salon.rating ?? 0) * 20;
  score += Math.min(salon.reviewCount ?? 0, 100) * 0.4;

  if (salon.lat && salon.lng && ctx.lat != null && ctx.lng != null) {
    const km = haversineKm(ctx.lat, ctx.lng, salon.lat, salon.lng);
    salon.distanceKm = Math.round(km * 10) / 10;
    score += Math.max(0, 40 - km * 2.5);
    if (km <= 2) score += 15;
    else if (km <= 5) score += 8;
  } else if (salon.distanceKm > 0) {
    score += Math.max(0, 25 - salon.distanceKm * 2);
  }

  return score;
}

/** Joylashuv, reyting va masofa bo‘yicha salonlarni tartiblash. */
export function rankSalonsForUser(salons: Salon[], ctx: RecommendContext): Salon[] {
  if (!salons.length) return salons;

  return [...salons]
    .map((s) => ({
      salon: { ...s },
      score: recommendScore({ ...s }, ctx),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ salon }) => salon);
}

export function userRecommendContext(user?: {
  region?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
} | null): RecommendContext {
  if (!user) return {};
  const lat =
    user.latitude != null && user.latitude !== ""
      ? parseFloat(String(user.latitude))
      : null;
  const lng =
    user.longitude != null && user.longitude !== ""
      ? parseFloat(String(user.longitude))
      : null;
  return {
    region: user.region || null,
    lat: lat != null && Number.isFinite(lat) ? lat : null,
    lng: lng != null && Number.isFinite(lng) ? lng : null,
  };
}

export function needsOnboarding(user?: {
  onboarding_completed?: boolean;
} | null): boolean {
  if (!user) return true;
  return user.onboarding_completed !== true;
}
