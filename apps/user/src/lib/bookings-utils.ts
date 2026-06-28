import type { BookingItem } from "@/lib/mock-data";

export function isUpcomingBooking(booking: BookingItem, now = Date.now()): boolean {
  if (booking.status === "cancelled" || booking.status === "done") return false;
  if (booking.status === "in_progress") return true;
  return new Date(booking.date).getTime() >= now;
}

export function getUpcomingBookings(list: BookingItem[] | null | undefined, now = Date.now()): BookingItem[] {
  const safe = Array.isArray(list) ? list : [];
  return safe
    .filter((b) => isUpcomingBooking(b, now))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function formatBookingWhen(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("uz-UZ", { weekday: "short", day: "numeric", month: "short" }),
    time: d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
  };
}
