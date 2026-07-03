import type { ApiBooking } from "@/lib/api/types";
import type { BookingItem } from "@/lib/mock-data";

function mapStatus(status: string): BookingItem["status"] {
  if (status === "completed") return "done";
  if (
    status === "pending" ||
    status === "accepted" ||
    status === "cancelled" ||
    status === "in_progress"
  ) {
    return status;
  }
  if (status === "rejected") return "cancelled";
  return "pending";
}

export function mapBooking(api: ApiBooking): BookingItem {
  const lines = (api.lines ?? []).map((line) => ({
    service_name: line.service_name,
    duration_minutes: line.duration_minutes,
    price: line.price,
  }));
  const line = lines[0];
  return {
    id: String(api.id),
    salonId: api.salon ? String(api.salon) : "",
    salonName: api.salon_name ?? "Salon",
    barberName: api.barber_name,
    barberId: api.barber,
    serviceName: line?.service_name ?? "Xizmat",
    date: api.start_at,
    endAt: api.end_at,
    startedAt: api.started_at,
    duration: line?.duration_minutes ?? 30,
    price: api.total_price,
    status: mapStatus(api.status),
    coverSeed: api.salon ? String(api.salon) : String(api.barber),
    bookedForName:
      api.family_member != null && api.booked_for_name ? api.booked_for_name : undefined,
    hasReview: api.has_review,
    reviewId: api.review_id != null ? String(api.review_id) : undefined,
    lines,
    salonAddress: api.salon_address ?? undefined,
    salonLatitude: api.salon_latitude ?? undefined,
    salonLongitude: api.salon_longitude ?? undefined,
    checkedInAt: api.checked_in_at ?? undefined,
    portfolioConsent: api.portfolio_consent ?? null,
    portfolioAllowed: api.portfolio_allowed ?? false,
    resultImageUrl: api.result_image_url ?? undefined,
    orderNumber: api.order_number ?? `MS-${api.id}`,
    checkInCode: api.check_in_code ?? undefined,
    checkInShortCode: api.check_in_short_code ?? undefined,
    statusHistory: api.status_history ?? [],
    paymentMethod: api.payment_method === "online" ? "online" : "cash",
    paymentStatus: api.payment_status,
    paidAt: api.paid_at ?? undefined,
    createdAt: api.created_at,
    barberImpressions: api.booking_client_impressions?.length
      ? api.booking_client_impressions
      : undefined,
  };
}

export function mapBookings(list: ApiBooking[]): BookingItem[] {
  return list.map(mapBooking);
}
