import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiJson, formatApiError } from "@/lib/api";
import type { BookingApi, BookingStatusApi } from "@/lib/api-types";

export function useBookings(status?: BookingStatusApi) {
  return useQuery({
    queryKey: ["bookings", status ?? "all"],
    queryFn: async () => {
      const q = status ? `?status=${encodeURIComponent(status)}` : "";
      return apiJson<BookingApi[]>(`/api/v1/bookings/${q}`);
    },
  });
}

export function useStartBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiFetch(`/api/v1/bookings/${bookingId}/start/`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(formatApiError(body, "Start failed"));
      }
      return (await res.json()) as BookingApi;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useCompleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiFetch(`/api/v1/bookings/${bookingId}/complete/`, {
        method: "POST",
        body: JSON.stringify({ early_finish: true, portfolio_allowed: false }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(formatApiError(body, "Complete failed"));
      }
      return (await res.json()) as BookingApi;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

