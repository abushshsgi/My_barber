import { apiJson } from "./client";
import { apiList } from "./list-utils";
import type { ApiAvailabilityMonth, ApiAvailabilitySlot, ApiBooking } from "./types";

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function fetchBookings(status?: string): Promise<ApiBooking[]> {
  return apiList<ApiBooking>(`/api/v1/bookings/${qs({ status })}`);
}

export type CreateBookingPayload = {
  salon?: number | null;
  barber: number;
  start_at: string;
  service_ids?: number[];
  barber_service_ids?: number[];
  family_member_id?: number | null;
  payment_method?: "cash" | "online";
};

export async function createBooking(data: CreateBookingPayload): Promise<ApiBooking> {
  return apiJson<ApiBooking>("/api/v1/bookings/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function cancelBooking(id: number | string): Promise<ApiBooking> {
  return apiJson<ApiBooking>(`/api/v1/bookings/${id}/cancel/`, { method: "POST" });
}

export async function fetchBookingAvailability(params: {
  salon: number;
  barber: number;
  date: string;
  service_ids: string;
}): Promise<{ slots: ApiAvailabilitySlot[] | string[]; closed_reason?: string; detail?: string }> {
  return apiJson(`/api/v1/bookings/availability/${qs(params)}`);
}

export async function fetchAvailabilityMonth(params: {
  salon: number;
  year: number;
  month: number;
  barber?: number;
  service_ids?: string;
}): Promise<ApiAvailabilityMonth> {
  return apiJson(`/api/v1/bookings/availability/month/${qs(params)}`);
}
