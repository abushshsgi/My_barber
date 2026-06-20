import type { ApiBooking } from "@/lib/api/types";
import type { BookingItem } from "@/lib/mock-data";

function mapStatus(status: string): BookingItem["status"] {
  if (status === "completed") return "done";
  if (status === "pending" || status === "accepted" || status === "cancelled") return status;
  if (status === "in_progress") return "accepted";
  if (status === "rejected") return "cancelled";
  return "pending";
}

export function mapBooking(api: ApiBooking): BookingItem {
  const line = api.lines?.[0];
  return {
    id: String(api.id),
    salonId: api.salon ? String(api.salon) : "",
    salonName: api.salon_name ?? "Salon",
    barberName: api.barber_name,
    serviceName: line?.service_name ?? "Xizmat",
    date: api.start_at,
    duration: line?.duration_minutes ?? 30,
    price: api.total_price,
    status: mapStatus(api.status),
    coverSeed: api.salon ? String(api.salon) : String(api.barber),
    bookedForName:
      api.family_member != null && api.booked_for_name ? api.booked_for_name : undefined,
  };
}

export function mapBookings(list: ApiBooking[]): BookingItem[] {
  return list.map(mapBooking);
}
