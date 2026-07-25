import type { Salon } from "@/lib/mock-data";
import type { RegionOption } from "@/lib/api/user";

export type RecommendContext = {
  lat?: number | null;
  lng?: number | null;
  region?: string | null;
  /** Viloyat/shahar nomi (masalan «Toshkent shahri») — manzil matnida qidirish uchun. */
  regionLabel?: string | null;
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

function regionTokens(ctx: RecommendContext): string[] {
  const tokens = new Set<string>();
  if (ctx.region) tokens.add(ctx.region.toLowerCase());
  if (ctx.regionLabel) {
    const label = ctx.regionLabel.toLowerCase();
    tokens.add(label);
    for (const part of label.split(/\s+/)) {
      if (part.length > 3) tokens.add(part);
    }
  }
  return [...tokens];
}

function regionAddressBoost(salon: Salon, ctx: RecommendContext): number {
  const address = salon.address?.toLowerCase() ?? "";
  if (!address) return 0;
  let boost = 0;
  for (const token of regionTokens(ctx)) {
    if (token.length > 2 && address.includes(token)) {
      boost = Math.max(boost, 22);
    }
  }
  if (ctx.region === "TOSHKENT_SH" && /toshkent|ташкент/i.test(address)) {
    boost = Math.max(boost, 18);
  }
  return boost;
}

function distanceScore(km: number): number {
  if (km <= 1) return 55;
  if (km <= 3) return 45;
  if (km <= 7) return 32;
  if (km <= 15) return 18;
  if (km <= 30) return 8;
  return Math.max(0, 5 - km * 0.1);
}

function recommendScore(salon: Salon, ctx: RecommendContext): number {
  let score = (salon.rating ?? 0) * 22;
  score += Math.min(salon.reviewCount ?? 0, 100) * 0.35;

  if (salon.lat && salon.lng && ctx.lat != null && ctx.lng != null) {
    const km = haversineKm(ctx.lat, ctx.lng, salon.lat, salon.lng);
    salon.distanceKm = Math.round(km * 10) / 10;
    score += distanceScore(km);
  } else if (salon.distanceKm > 0) {
    score += distanceScore(salon.distanceKm);
  }

  score += regionAddressBoost(salon, ctx);

  return score;
}

/** Joylashuv, reyting va masofa bo‘yicha salonlarni tartiblash. */
export function rankSalonsForUser(salons: Salon[], ctx: RecommendContext): Salon[] {
  if (!salons.length) return salons;

  return [...salons]
    .map((s) => {
      // Bitta nusxa — recommendScore distanceKm ni shu obyektga yozadi.
      const salon = { ...s };
      const score = recommendScore(salon, ctx);
      return { salon, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.salon.distanceKm || 999) - (b.salon.distanceKm || 999);
    })
    .map(({ salon }) => salon);
}

/** Reyting, masofa va xizmatlar bo‘yicha barberlarni tartiblash. */
export function rankBarbersForUser(
  barbers: import("@/lib/mappers/barber").BarberDiscovery[],
  ctx: RecommendContext,
) {
  if (!barbers.length) return barbers;
  return [...barbers]
    .map((b) => {
      let score = (b.rating ?? 0) * 24 + Math.min(b.reviewCount ?? 0, 80) * 0.4;
      if (b.lat && b.lng && ctx.lat != null && ctx.lng != null) {
        const km = haversineKm(ctx.lat, ctx.lng, b.lat, b.lng);
        score += distanceScore(km);
        return { barber: { ...b, distanceKm: Math.round(km * 10) / 10 }, score };
      }
      if (b.distanceKm > 0) score += distanceScore(b.distanceKm);
      if (b.priceFrom > 0) score += 4;
      return { barber: b, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.barber.distanceKm || 999) - (b.barber.distanceKm || 999);
    })
    .map(({ barber }) => barber);
}

export function buildRecommendContext(
  user?: {
    region?: string | null;
    latitude?: string | number | null;
    longitude?: string | number | null;
  } | null,
  regions: RegionOption[] = [],
): RecommendContext {
  if (!user) return {};
  const lat =
    user.latitude != null && user.latitude !== ""
      ? parseFloat(String(user.latitude))
      : null;
  const lng =
    user.longitude != null && user.longitude !== ""
      ? parseFloat(String(user.longitude))
      : null;
  const region = user.region || null;
  const regionLabel = region
    ? regions.find((r) => r.value === region)?.label ?? null
    : null;
  return {
    region,
    regionLabel,
    lat: lat != null && Number.isFinite(lat) ? lat : null,
    lng: lng != null && Number.isFinite(lng) ? lng : null,
  };
}

/** @deprecated buildRecommendContext ishlating. */
export function userRecommendContext(user?: {
  region?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
} | null): RecommendContext {
  return buildRecommendContext(user);
}

export function needsOnboarding(user?: {
  onboarding_completed?: boolean;
} | null): boolean {
  if (!user) return true;
  return user.onboarding_completed !== true;
}
