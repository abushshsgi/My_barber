import type { BookingItem } from "@/lib/mock-data";

export function isUpcomingBooking(booking: BookingItem, now = Date.now()): boolean {
  return new Date(booking.date).getTime() >= now && booking.status !== "cancelled";
}

export function getUpcomingBookings(list: BookingItem[], now = Date.now()): BookingItem[] {
  return list
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
