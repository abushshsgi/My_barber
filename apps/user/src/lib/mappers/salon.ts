import type { ApiNearbySalon, ApiSalonDetail, ApiSalonList } from "@/lib/api/types";
import { getSalonCoverUrl } from "@/lib/cover-images";
import type { Audience, Category, Salon } from "@/lib/mock-data";

function toNum(v: string | number | null | undefined, fallback = 0): number {
  if (v == null) return fallback;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function defaultCategory(_salon: ApiSalonList): Category {
  return "barber";
}

function defaultAudience(_salon: ApiSalonList): Audience {
  return "unisex";
}

function priceRange(services: { price: number }[] | undefined): { from: number; to: number } {
  if (!services?.length) return { from: 0, to: 0 };
  const prices = services.map((s) => s.price);
  return { from: Math.min(...prices), to: Math.max(...prices) };
}

export function mapSalonList(api: ApiSalonList, distanceKm = 0): Salon {
  const coverSeed = api.slug || String(api.id);
  return {
    id: String(api.id),
    name: api.name,
    category: defaultCategory(api),
    audience: defaultAudience(api),
    rating: api.rating_avg ?? 0,
    reviewCount: api.review_count ?? 0,
    address: api.address || "",
    distanceKm,
    priceFrom: 0,
    priceTo: 0,
    coverSeed,
    // Hozircha API cover_image o‘rniga barqaror mock rasmlar
    coverUrl: getSalonCoverUrl(coverSeed),
    about: "",
    services: [],
    staff: [],
    reviews: [],
    portfolio: [],
    lat: toNum(api.latitude),
    lng: toNum(api.longitude),
  };
}

export function mapSalonDetail(api: ApiSalonDetail, distanceKm = 0): Salon {
  const { from, to } = priceRange(api.services);
  const base = mapSalonList(api, distanceKm);
  return {
    ...base,
    about: api.description || "",
    priceFrom: from,
    priceTo: to,
    coverUrl: base.coverUrl,
    services: (api.services ?? []).map((s) => ({
      id: String(s.id),
      name: s.name,
      duration: s.duration_minutes,
      price: s.price,
    })),
    portfolio: (api.images ?? []).map((img) => img.image),
  };
}

export function mapNearbySalon(row: ApiNearbySalon): Salon {
  return mapSalonList(row.salon, row.distance_km);
}

export function mapStaffToBarber(
  staff: { id: number; full_name: string; avatar: string | null; role: string },
  salonId: string,
  serviceIds: string[] = [],
) {
  return {
    id: String(staff.id),
    name: staff.full_name,
    role: staff.role,
    rating: 4.8,
    avatarSeed: String(staff.id),
    avatarUrl: staff.avatar || undefined,
    serviceIds,
    salonId,
  };
}
