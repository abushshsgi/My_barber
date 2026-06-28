import type { ApiBarberPublic } from "@/lib/api/types";

export type BarberDiscovery = {
  id: string;
  barberId: string;
  profileId: string;
  name: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  lat: number;
  lng: number;
  distanceKm: number;
  bookingKind: "salon" | "independent";
  salonId: string | null;
  salonName: string | null;
  amenities: { code: string; icon: string; label: string }[];
  workLocation: { code: string; label: string } | null;
  paymentMethods: { code: string; label: string }[];
  priceFrom: number;
  servicesPreview: string[];
};

function toNum(v: string | number | null | undefined, fallback = 0): number {
  if (v == null) return fallback;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export function mapBarberDiscovery(api: ApiBarberPublic): BarberDiscovery {
  const services = api.active_services ?? api.services ?? [];
  const prices = services.map((s) => toNum(s.price)).filter((p) => p > 0);
  return {
    id: `b-${api.barber_id}`,
    barberId: String(api.barber_id),
    profileId: String(api.id),
    name: api.name,
    avatar: api.avatar?.trim() || "",
    rating: api.avg_rating ?? 0,
    reviewCount: api.review_count ?? 0,
    lat: toNum(api.latitude),
    lng: toNum(api.longitude),
    distanceKm: api.distance_km ?? 0,
    bookingKind: api.booking_kind === "salon" ? "salon" : "independent",
    salonId: api.salon_id != null ? String(api.salon_id) : null,
    salonName: api.salon_name ?? null,
    amenities: api.amenities ?? [],
    workLocation: api.work_location ?? null,
    paymentMethods: api.payment_methods ?? [],
    priceFrom: prices.length ? Math.min(...prices) : 0,
    servicesPreview: services.slice(0, 3).map((s) => s.name),
  };
}
