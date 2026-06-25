/** Map booking API rows to barber dashboard Booking type. */

import type { Booking } from "@/components/barber/BarberContext";

export type ApiBookingRow = {
  id: number;
  customer_name: string;
  customer_phone?: string;
  customer_avatar?: string | null;
  start_at: string;
  end_at?: string;
  status: string;
  total_price: string | number;
  lines: Array<{ service_name: string; duration_minutes: number; price: string | number }>;
};

function mapBookingStatus(st: string): Booking["status"] {
  const s = (st || "").toLowerCase();
  if (s === "pending") return "pending";
  if (s === "accepted") return "accepted";
  if (s === "in_progress") return "in_progress";
  if (s === "completed") return "completed";
  if (s === "rejected") return "rejected";
  if (s === "cancelled") return "cancelled";
  return "pending";
}

export function mapApiBooking(b: ApiBookingRow): Booking {
  const dt = new Date(b.start_at);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const bookingDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const diffDays = Math.round((bookingDay.getTime() - today.getTime()) / 86400000);
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  const status = mapBookingStatus(b.status);
  const line0 = b.lines?.[0];
  const service = line0?.service_name || "Xizmat";
  const duration_min = line0?.duration_minutes || 30;
  const priceN = typeof b.total_price === "string" ? Number(b.total_price) : b.total_price;
  return {
    id: String(b.id),
    client: b.customer_name || "Mijoz",
    client_avatar: (b.customer_avatar && String(b.customer_avatar)) || "",
    service,
    start_at: b.start_at,
    date:
      diffDays === 0
        ? "Today"
        : diffDays === 1
          ? "Tomorrow"
          : dt.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" }),
    time: `${hh}:${mm}`,
    duration_min,
    price: Number.isFinite(priceN) ? Number(priceN) : 0,
    status,
  };
}

export type BookingAction = "accept" | "reject" | "start" | "complete" | "cancel";

export function statusAfterAction(
  action: BookingAction,
  current: Booking["status"],
): Booking["status"] {
  switch (action) {
    case "accept":
      return "accepted";
    case "reject":
      return "rejected";
    case "start":
      return "in_progress";
    case "complete":
      return "completed";
    case "cancel":
      return current === "pending" ? "cancelled" : current;
    default:
      return current;
  }
}
