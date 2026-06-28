import type { ApiNearbySalon, ApiSalonDetail, ApiSalonList, ApiSalonRatingSummary } from "@/lib/api/types";
import { resolveCoverUrl } from "@/lib/cover-images";
import { resolveMediaUrl } from "@/lib/media-url";
import type { Audience, Category, Salon, SalonRatingSummary } from "@/lib/mock-data";

function toNum(v: string | number | null | undefined, fallback = 0): number {
  if (v == null) return fallback;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function audienceForCategory(category: Category): Audience {
  if (category === "barber") return "men";
  if (category === "beauty" || category === "nails" || category === "spa") return "women";
  return "unisex";
}

function resolveCategory(api: ApiSalonList): Category {
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
  const priceFrom = toNum(api.price_from);
  const resolvedCover = resolveMediaUrl(api.cover_image);
  const coverUrl = resolveCoverUrl(resolvedCover, coverSeed, category);
  return {
    id: String(api.id),
    ownerId: api.owner_id != null ? String(api.owner_id) : undefined,
    name: api.name,
    category,
    audience,
    rating: api.rating_avg ?? 0,
    reviewCount: api.review_count ?? 0,
    address: api.address || "",
    distanceKm,
    priceFrom,
    priceTo: priceFrom,
    coverSeed,
    coverUrl,
    about: "",
    services: [],
    staff: [],
    reviews: [],
    portfolio: [],
    lat: toNum(api.latitude),
    lng: toNum(api.longitude),
    amenities: (api.amenities ?? []).map((a) => ({
      code: a.code,
      icon: a.icon,
      label: a.label,
    })),
    venueKind: api.venue_kind === "salon" ? "salon" : api.venue_kind === "solo_studio" ? "solo_studio" : undefined,
    hours: [],
    closedWeekdays: [],
    ratingSummary: null,
  };
}

export function mapApiServices(
  services: {
    id: number;
    name: string;
    duration_minutes: number;
    price: string | number;
    barber?: number | null;
    barber_name?: string | null;
  }[],
) {
  return services.map((s) => ({
    id: String(s.id),
    name: s.name,
    duration: s.duration_minutes,
    price: toNum(s.price),
    barberId: s.barber != null ? String(s.barber) : null,
    barberName: s.barber_name ?? null,
  }));
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
    services: mapApiServices(api.services ?? []),
    portfolio: (api.images ?? []).map((img) => img.image),
    amenities: (api.amenities ?? []).map((a) => ({
      code: a.code,
      icon: a.icon,
      label: a.label,
    })),
    hours: (api.hours ?? []).map((h) => ({
      weekday: h.weekday,
      openTime: h.open_time?.slice(0, 5) ?? "",
      closeTime: h.close_time?.slice(0, 5) ?? "",
    })),
    closedWeekdays: api.closed_weekdays ?? [],
    ratingSummary: null,
  };
}

export function mapRatingSummary(api: ApiSalonRatingSummary): SalonRatingSummary {
  return {
    ratingAvg: api.rating_avg ?? 0,
    reviewCount: api.review_count ?? 0,
    isGuestFavorite: api.is_guest_favorite ?? false,
    distribution: api.distribution ?? {},
    highlights: api.highlights ?? [],
  };
}

export function mapNearbySalon(row: ApiNearbySalon): Salon {
  return mapSalonList(row.salon, row.distance_km);
}

export function mapStaffToBarber(
  staff: {
    id: number;
    full_name: string;
    avatar: string | null;
    role: string;
    is_bookable?: boolean;
  },
  salonId: string,
  services: { id: string; barberId?: string | null }[] = [],
) {
  const barberId = String(staff.id);
  const serviceIds = services
    .filter((s) => !s.barberId || s.barberId === barberId)
    .map((s) => s.id);
  const roleLabel =
    staff.role === "owner" ? "Salon egasi" : staff.role === "worker" ? "Usta" : staff.role;
  return {
    id: barberId,
    name: staff.full_name,
    role: roleLabel,
    rating: 4.8,
    avatarSeed: barberId,
    avatarUrl: staff.avatar || undefined,
    serviceIds,
    isBookable: staff.is_bookable !== false,
    salonId,
  };
}
