import type { ApiNearbySalon, ApiSalonDetail, ApiSalonList } from "@/lib/api/types";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { resolveMediaUrl } from "@/lib/media-url";
import type { Audience, Category, Salon } from "@/lib/mock-data";

function toNum(v: string | number | null | undefined, fallback = 0): number {
  if (v == null) return fallback;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function mockKindFromSlug(slug: string): Category | null {
  const match = /^mock-tashkent-(\d{3})$/.exec(slug);
  if (!match) return null;
  const kinds: Category[] = ["barber", "barber", "barber", "beauty", "nails", "spa"];
  const idx = parseInt(match[1], 10) - 1;
  return kinds[idx % kinds.length] ?? "barber";
}

function audienceForCategory(category: Category): Audience {
  if (category === "barber") return "men";
  if (category === "beauty" || category === "nails" || category === "spa") return "women";
  return "unisex";
}

function resolveCategory(api: ApiSalonList): Category {
  const fromSlug = mockKindFromSlug(api.slug || "");
  if (fromSlug) return fromSlug;
  const name = api.name.toLowerCase();
  if (/nail|gel pro|manicure|polish/i.test(name)) return "nails";
  if (/spa|wellness|harmony|zen|oasis|serenity|retreat|calm|hammom|massaj/i.test(name)) return "spa";
  if (/glow|beauty|silk|luxe|chic|rose|elite|viva|pearl|femme|studio/i.test(name)) return "beauty";
  return "barber";
}

function resolveCategoryAndAudience(api: ApiSalonList): { category: Category; audience: Audience } {
  const category = resolveCategory(api);
  return { category, audience: audienceForCategory(category) };
}

function priceRange(services: { price: number }[] | undefined): { from: number; to: number } {
  if (!services?.length) return { from: 0, to: 0 };
  const prices = services.map((s) => toNum(s.price));
  return { from: Math.min(...prices), to: Math.max(...prices) };
}

export function mapSalonList(api: ApiSalonList, distanceKm = 0): Salon {
  const coverSeed = api.slug || String(api.id);
  const { category, audience } = resolveCategoryAndAudience(api);
  return {
    id: String(api.id),
    name: api.name,
    category,
    audience,
    rating: api.rating_avg ?? 0,
    reviewCount: api.review_count ?? 0,
    address: api.address || "",
    distanceKm,
    priceFrom: 0,
    priceTo: 0,
    coverSeed,
    coverUrl: resolveMediaUrl(api.cover_image) ?? getSalonCoverUrl(coverSeed),
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
      price: toNum(s.price),
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
