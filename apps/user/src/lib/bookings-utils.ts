import type { BookingLifecycleStatus } from "@mybarber/shared/booking-lifecycle";
import { bookingNeedsLiveRefresh } from "@mybarber/shared/booking-lifecycle";
import type { BookingItem } from "@/lib/mock-data";

export function bookingLifecycleStatus(booking: BookingItem): BookingLifecycleStatus {
  if (booking.status === "done") return "completed";
  if (booking.status === "cancelled") return "cancelled";
  return booking.status;
}

export function isUpcomingBooking(booking: BookingItem, now = Date.now()): boolean {
  if (booking.status === "cancelled" || booking.status === "done") return false;
  if (booking.status === "in_progress") return true;
  return new Date(booking.date).getTime() >= now;
}

export function isHistoryBooking(booking: BookingItem, now = Date.now()): boolean {
  if (booking.status === "done" || booking.status === "cancelled") return true;
  return new Date(booking.date).getTime() < now;
}

export function getUpcomingBookings(list: BookingItem[] | null | undefined, now = Date.now()): BookingItem[] {
  const safe = Array.isArray(list) ? list : [];
  return safe
    .filter((b) => isUpcomingBooking(b, now))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getHistoryBookings(list: BookingItem[] | null | undefined, now = Date.now()): BookingItem[] {
  const safe = Array.isArray(list) ? list : [];
  return safe
    .filter((b) => isHistoryBooking(b, now))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function bookingsNeedLivePolling(list: BookingItem[] | null | undefined): boolean {
  const safe = Array.isArray(list) ? list : [];
  return safe.some((b) => bookingNeedsLiveRefresh(bookingLifecycleStatus(b)));
}

export function formatBookingWhen(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("uz-UZ", { weekday: "short", day: "numeric", month: "short" }),
    time: d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
  };
}
