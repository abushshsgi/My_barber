import type { Barber, BookingItem, Category, Review, Salon, Service } from "@/lib/mock-data";
import type {
  ApiBooking,
  ApiReview,
  ApiSalonService,
  ApiSalonStaff,
  SalonDetailApi,
  SalonListApi,
} from "@/lib/user-api";

function numberValue(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function inferCategory(name: string, services: ApiSalonService[] = []): Category {
  const text = `${name} ${services.map((s) => s.name).join(" ")}`.toLowerCase();
  if (text.includes("nail") || text.includes("manikyur")) return "nails";
  if (text.includes("spa") || text.includes("massaj")) return "spa";
  if (text.includes("beauty") || text.includes("go'zallik") || text.includes("make")) return "beauty";
  return "barber";
}

function minMaxPrices(services: ApiSalonService[]): { from: number; to: number } {
  const prices = services.map((s) => numberValue(s.price)).filter((price) => price > 0);
  if (prices.length === 0) return { from: 0, to: 0 };
  return { from: Math.min(...prices), to: Math.max(...prices) };
}

function toService(service: ApiSalonService, salonId: string): Service {
  return {
    id: String(service.id),
    name: service.name,
    duration: service.duration_minutes,
    price: numberValue(service.price),
  };
}

function toStaff(staff: ApiSalonStaff, services: ApiSalonService[], salonId: string): Barber {
  return {
    id: String(staff.id),
    name: staff.full_name,
    role: staff.role || "Senior barber",
    rating: 4.9,
    avatarSeed: staff.avatar || staff.full_name,
    serviceIds: services
      .filter((service) => String(service.barber || "") === String(staff.id))
      .map((service) => String(service.id)),
    salonId,
  };
}

function toReview(review: ApiReview): Review {
  return {
    id: String(review.id),
    author: review.author_name || "Mijoz",
    rating: review.rating,
    text: review.text || "",
    date: new Date(review.created_at).toLocaleDateString("uz-UZ", {
      day: "numeric",
      month: "short",
    }),
  };
}

export function salonListToViewModel(row: SalonListApi): Salon {
  const rating = numberValue(row.rating_avg, 0);
  return {
    id: String(row.id),
    name: row.name,
    category: "barber",
    audience: "unisex",
    rating,
    reviewCount: row.review_count || 0,
    address: row.address || "Manzil kiritilmagan",
    distanceKm: 0,
    priceFrom: 0,
    priceTo: 0,
    coverSeed: row.cover_image || String(row.id),
    about: "",
    services: [],
    staff: [],
    reviews: [],
    portfolio: [],
    lat: numberValue(row.latitude, 41.3111),
    lng: numberValue(row.longitude, 69.2797),
  };
}

export function salonDetailToViewModel(
  detail: SalonDetailApi,
  staffRows: ApiSalonStaff[] = [],
  reviewRows: ApiReview[] = [],
  portfolioRows: { image: string | null }[] = [],
): Salon {
  const services = detail.services || [];
  const prices = minMaxPrices(services);
  const salonId = String(detail.id);
  const category = inferCategory(detail.name, services);

  return {
    id: salonId,
    name: detail.name,
    category,
    audience: "unisex",
    rating: numberValue(detail.rating_avg, 0),
    reviewCount: detail.review_count || reviewRows.length,
    address: detail.address || "Manzil kiritilmagan",
    distanceKm: 0,
    priceFrom: prices.from,
    priceTo: prices.to,
    coverSeed: detail.cover_image || String(detail.id),
    about: detail.description || "Salon haqida ma'lumot tez orada qo'shiladi.",
    services: services.map((service) => toService(service, salonId)),
    staff: staffRows.map((staff) => toStaff(staff, services, salonId)),
    reviews: reviewRows.map(toReview),
    portfolio: [
      ...(detail.images || []).map((image) => image.image),
      ...portfolioRows.map((row) => row.image).filter((image): image is string => Boolean(image)),
    ],
    lat: numberValue(detail.latitude, 41.3111),
    lng: numberValue(detail.longitude, 69.2797),
  };
}

export function bookingToViewModel(booking: ApiBooking): BookingItem {
  const status: BookingItem["status"] =
    booking.status === "completed"
      ? "done"
      : booking.status === "cancelled" || booking.status === "rejected"
        ? "cancelled"
        : booking.status === "accepted" || booking.status === "in_progress"
          ? "accepted"
          : "pending";
  const firstLine = booking.lines[0];
  const serviceName =
    booking.lines.length > 1
      ? booking.lines.map((line) => line.service_name).join(", ")
      : firstLine?.service_name || "Xizmat";

  return {
    id: String(booking.id),
    salonId: booking.salon ? String(booking.salon) : `barber-${booking.barber}`,
    salonName: booking.salon_name || "Mustaqil usta",
    barberName: booking.barber_name || "Usta",
    serviceName,
    date: booking.start_at,
    duration: booking.lines.reduce((sum, line) => sum + line.duration_minutes, 0),
    price: numberValue(booking.total_price),
    status,
    coverSeed: String(booking.salon || booking.barber),
  };
}

export function todayDateValue(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function buildStartAt(dateValue: string, slot: string): string {
  const [hours, minutes] = slot.split(":").map(Number);
  const date = new Date(`${dateValue}T00:00:00`);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date.toISOString();
}
