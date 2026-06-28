import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelBooking,
  createBooking,
  fetchAvailabilityMonth,
  fetchBooking,
  fetchBookingAvailability,
  fetchBookings,
  setPortfolioConsent,
  type CreateBookingPayload,
} from "@/lib/api/bookings";
import { authQueryEnabled, catalogQueryEnabled } from "@/lib/auth-query";
import { getAuthUserId } from "@/lib/auth-user";
import { userQueryKey } from "@/lib/query-keys";
import { mapBooking, mapBookings } from "@/lib/mappers/booking";
import { bookingLifecycleStatus, bookingsNeedLivePolling } from "@/lib/bookings-utils";
import { bookingNeedsLiveRefresh } from "@mybarber/shared/booking-lifecycle";

export const bookingsQueryKeyBase = ["bookings"] as const;

export function bookingsQueryKeyFor(userId: number | null) {
  return userQueryKey(bookingsQueryKeyBase, userId);
}

export function useBookings() {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: bookingsQueryKeyFor(userId),
    queryFn: async () => mapBookings(await fetchBookings()),
    staleTime: 8_000,
    enabled: authQueryEnabled(!!userId),
    refetchInterval: (q) => (bookingsNeedLivePolling(q.state.data) ? 5_000 : false),
    refetchOnWindowFocus: true,
  });
}

export function useBooking(bookingId: string) {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: userQueryKey([...bookingsQueryKeyBase, bookingId] as const, userId),
    queryFn: async () => mapBooking(await fetchBooking(bookingId)),
    enabled: authQueryEnabled(!!userId && Boolean(bookingId)),
    staleTime: 5_000,
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (!status) return false;
      if (bookingNeedsLiveRefresh(bookingLifecycleStatus(q.state.data!))) {
        return status === "in_progress" ? 2_000 : 4_000;
      }
      return false;
    },
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBookingPayload) => createBooking(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bookingsQueryKeyBase });
      void qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => cancelBooking(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bookingsQueryKeyBase });
    },
  });
}

export function usePortfolioConsentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, consent }: { id: string; consent: boolean }) => setPortfolioConsent(id, consent),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: bookingsQueryKeyBase });
      void qc.invalidateQueries({ queryKey: [...bookingsQueryKeyBase, vars.id] });
    },
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

export function useAvailabilityMonth(params: {
  salon: number;
  year: number;
  month: number;
  barber?: number;
  serviceIds?: number[];
  enabled?: boolean;
}) {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: userQueryKey(
      ["bookings", "availability-month", JSON.stringify(params)] as const,
      userId,
    ),
    queryFn: () =>
      fetchAvailabilityMonth({
        salon: params.salon,
        year: params.year,
        month: params.month,
        barber: params.barber,
        service_ids: params.serviceIds?.length ? params.serviceIds.join(",") : undefined,
      }),
    enabled: catalogQueryEnabled((params.enabled ?? true) && params.salon > 0),
  });
}
