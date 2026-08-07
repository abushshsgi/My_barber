import { resolveMediaUrl } from "../api/media";
import type { ApiSalonDetail, ApiSalonStaff, SalonDetail } from "../api/types";
import { CATEGORY_LABELS } from "./mappers";

function businessKindLabel(kind?: string): string {
  if (kind === "beauty_salon") return CATEGORY_LABELS.beauty;
  return CATEGORY_LABELS.barber;
}

function priceRange(services: ApiSalonDetail["services"]): { from: number; to: number } {
  const prices = (services ?? [])
    .map((s) => s.price)
    .filter((p) => Number.isFinite(p) && p > 0);
  if (prices.length === 0) return { from: 0, to: 0 };
  return { from: Math.min(...prices), to: Math.max(...prices) };
}

export function mapSalonDetail(
  api: ApiSalonDetail,
  distanceKm = 0,
  imageWidth?: number,
): SalonDetail {
  const { from, to } = priceRange(api.services);
  const gallery = (api.images ?? [])
    .map((img) => resolveMediaUrl(img.image, { width: imageWidth }))
    .filter((u): u is string => Boolean(u));
  const cover = resolveMediaUrl(api.cover_image, { width: imageWidth });
  const portfolio = [cover, ...gallery]
    .filter((u): u is string => Boolean(u))
    .filter((url, i, arr) => arr.indexOf(url) === i);

  return {
    id: String(api.id),
    name: api.name,
    categoryLabel: businessKindLabel(api.business_kind),
    address: api.address || "",
    distanceKm,
    rating: api.rating_avg ?? 0,
    reviewCount: api.review_count ?? 0,
    about: api.description || "",
    priceFrom: from || api.price_from || 0,
    priceTo: to || from || api.price_from || 0,
    coverUrl: portfolio[0] ?? null,
    portfolio,
    services: (api.services ?? []).map((s) => ({
      id: String(s.id),
      name: s.name,
      price: s.price,
      duration: s.duration_minutes ?? 0,
      barberName: s.barber_name ?? null,
    })),
    staff: [],
    amenities: api.amenities ?? [],
    hours: (api.hours ?? []).map((h) => ({
      weekday: h.weekday,
      openTime: h.open_time?.slice(0, 5) ?? "",
      closeTime: h.close_time?.slice(0, 5) ?? "",
    })),
  };
}

export function mapSalonStaff(
  staff: ApiSalonStaff[],
  imageWidth?: number,
): SalonDetail["staff"] {
  return staff.map((s) => ({
    id: String(s.id),
    name: s.full_name,
    avatarUrl: resolveMediaUrl(s.avatar, { width: imageWidth }),
    role: s.role,
  }));
}

export const WEEKDAY_UZ = [
  "Du",
  "Se",
  "Ch",
  "Pa",
  "Ju",
  "Sh",
  "Ya",
] as const;
