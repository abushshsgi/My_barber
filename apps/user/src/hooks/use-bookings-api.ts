import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelBooking,
  createBooking,
  fetchBookingAvailability,
  fetchBookings,
  type CreateBookingPayload,
} from "@/lib/api/bookings";
import { authQueryEnabled } from "@/lib/auth-query";
import { mapBookings } from "@/lib/mappers/booking";

export const bookingsQueryKey = ["bookings"] as const;

export function useBookings() {
  return useQuery({
    queryKey: bookingsQueryKey,
    queryFn: async () => mapBookings(await fetchBookings()),
    staleTime: 15_000,
    enabled: authQueryEnabled(),
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBookingPayload) => createBooking(payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: bookingsQueryKey }),
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => cancelBooking(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: bookingsQueryKey }),
  });
}

export function useBookingAvailability(params: {
  salon: number;
  barber: number;
  date: string;
  serviceIds: number[];
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["bookings", "availability", params],
    queryFn: () =>
      fetchBookingAvailability({
        salon: params.salon,
        barber: params.barber,
        date: params.date,
        service_ids: params.serviceIds.join(","),
      }),
    enabled:
      authQueryEnabled(
        (params.enabled ?? true) &&
          params.salon > 0 &&
          params.barber > 0 &&
          params.date.length > 0 &&
          params.serviceIds.length > 0,
      ),
  });
}
