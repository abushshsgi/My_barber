import type { Booking } from "@/components/barber/BarberContext";
import { bookingDateLabel } from "./finance-range";

export type ApiBookingRow = {
  id: number;
  customer?: number;
  customer_name: string;
  customer_phone?: string;
  customer_avatar?: string | null;
  salon_name?: string | null;
  salon_address?: string | null;
  salon_latitude?: number | null;
  salon_longitude?: number | null;
  booked_for_name?: string | null;
  start_at: string;
  end_at?: string;
  started_at?: string | null;
  checked_in_at?: string | null;
  status: string;
  completed_at?: string | null;
  total_price: string | number;
  payment_method?: string;
  payment_status?: string;
  paid_at?: string | null;
  portfolio_consent?: boolean | null;
  portfolio_allowed?: boolean;
  result_image_url?: string | null;
  order_number?: string | null;
  check_in_code?: string | null;
  check_in_short_code?: string | null;
  notes?: string | null;
  created_at?: string;
  status_history?: Array<{ key: string; label: string; at: string }>;
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

function mapLinePrice(v: string | number): number {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
}

export function mapApiBooking(b: ApiBookingRow): Booking {
  const dt = new Date(b.start_at);
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  const status = mapBookingStatus(b.status);
  const lines = (b.lines ?? []).map((line) => ({
    service_name: line.service_name,
    duration_minutes: line.duration_minutes,
    price: mapLinePrice(line.price),
  }));
  const line0 = lines[0];
  const service = line0?.service_name || "Xizmat";
  const duration_min = line0?.duration_minutes || 30;
  const priceN = typeof b.total_price === "string" ? Number(b.total_price) : b.total_price;
  return {
    id: String(b.id),
    customer_id: b.customer != null ? String(b.customer) : undefined,
    client: b.customer_name || "Mijoz",
    client_avatar: (b.customer_avatar && String(b.customer_avatar)) || "",
    client_phone: b.customer_phone || undefined,
    service,
    lines,
    salon_name: b.salon_name ?? null,
    salon_address: b.salon_address ?? null,
    salon_latitude: b.salon_latitude ?? null,
    salon_longitude: b.salon_longitude ?? null,
    booked_for_name: b.booked_for_name ?? null,
    start_at: b.start_at,
    end_at: b.end_at,
    started_at: b.started_at ?? null,
    checked_in_at: b.checked_in_at ?? null,
    completed_at: b.completed_at ?? undefined,
    date: bookingDateLabel(b.start_at),
    time: `${hh}:${mm}`,
    duration_min,
    price: Number.isFinite(priceN) ? Number(priceN) : 0,
    status,
    payment_method: b.payment_method === "online" ? "online" : "cash",
    payment_status: b.payment_status,
    paid_at: b.paid_at ?? null,
    portfolio_consent: b.portfolio_consent ?? null,
    portfolio_allowed: b.portfolio_allowed ?? false,
    result_image_url: b.result_image_url ?? null,
    order_number: b.order_number ?? `MS-${b.id}`,
    check_in_code: b.check_in_code ?? undefined,
    notes: (b.notes ?? "").trim() || undefined,
    created_at: b.created_at,
    status_history: b.status_history ?? [],
  };
}

export type BookingAction = "accept" | "reject" | "start" | "complete" | "cancel" | "check_in";

export type CompleteBookingOptions = {
  early_finish?: boolean;
  portfolio_allowed?: boolean;
  result_image?: File | null;
};

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
