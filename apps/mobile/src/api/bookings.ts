import { apiJson, apiList, qs } from "./client";
import type { ApiAvailabilitySlot, ApiBooking, ApiService } from "./types";

export type CreateBookingPayload = {
  salon?: number | null;
  barber: number;
  start_at: string;
  service_ids?: number[];
  barber_service_ids?: number[];
  payment_method?: "cash" | "online";
  notes?: string;
  customer_phone?: string;
};

export async function fetchBookings(status?: string): Promise<ApiBooking[]> {
  return apiList<ApiBooking>(`/api/v1/bookings/${qs({ status })}`);
}

export async function fetchBooking(id: string | number): Promise<ApiBooking> {
  return apiJson<ApiBooking>(`/api/v1/bookings/${id}/`);
}

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
}): Promise<{
  slots: ApiAvailabilitySlot[] | string[];
  closed_reason?: string;
  detail?: string;
}> {
  return apiJson(`/api/v1/bookings/availability/${qs(params)}`);
}

export async function fetchSalonBarberServices(
  salonId: string | number,
  barberId: string | number,
): Promise<ApiService[]> {
  return apiJson<ApiService[]>(
    `/api/v1/salons/${salonId}/barber-services/${qs({ barber: barberId })}`,
  );
}
