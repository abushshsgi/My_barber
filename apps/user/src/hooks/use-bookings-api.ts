import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelBooking,
  createBooking,
  fetchBookingAvailability,
  fetchBookings,
  type CreateBookingPayload,
} from "@/lib/api/bookings";
import { authQueryEnabled } from "@/lib/auth-query";
import { getAuthUserId } from "@/lib/auth-user";
import { userQueryKey } from "@/lib/query-keys";
import { mapBookings } from "@/lib/mappers/booking";

export const bookingsQueryKeyBase = ["bookings"] as const;

export function bookingsQueryKeyFor(userId: number | null) {
  return userQueryKey(bookingsQueryKeyBase, userId);
}

export function useBookings() {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: bookingsQueryKeyFor(userId),
    queryFn: async () => mapBookings(await fetchBookings()),
    staleTime: 15_000,
    enabled: authQueryEnabled(!!userId),
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBookingPayload) => createBooking(payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: bookingsQueryKeyBase }),
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => cancelBooking(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: bookingsQueryKeyBase }),
  });
}

export function useBookingAvailability(params: {
  salon: number;
  barber: number;
  date: string;
  serviceIds: number[];
  enabled?: boolean;
}) {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: userQueryKey(["bookings", "availability", JSON.stringify(params)] as const, userId),
    queryFn: () =>
      fetchBookingAvailability({
        salon: params.salon,
        barber: params.barber,
        date: params.date,
        service_ids: params.serviceIds.join(","),
      }),
    enabled:
      authQueryEnabled(
        !!userId &&
          (params.enabled ?? true) &&
          params.salon > 0 &&
          params.barber > 0 &&
          params.date.length > 0 &&
          params.serviceIds.length > 0,
      ),
  });
}
