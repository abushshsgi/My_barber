import { useQuery } from "@tanstack/react-query";
import {
  fetchBarberByBarberId,
  fetchIndependentAvailability,
  fetchIndependentAvailabilityMonth,
} from "@/lib/api/barbers";
import { authQueryEnabled } from "@/lib/auth-query";

export function useBarberByBarberId(barberId: string) {
  return useQuery({
    queryKey: ["barbers", "by-barber-id", barberId],
    queryFn: () => fetchBarberByBarberId(barberId),
    enabled: authQueryEnabled(Boolean(barberId)),
    staleTime: 60_000,
  });
}

export function useIndependentAvailability(params: {
  barber: number;
  date: string;
  barberServiceIds: number[];
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["barbers", "availability", params],
    queryFn: () =>
      fetchIndependentAvailability({
        barber: params.barber,
        date: params.date,
        barber_service_ids: params.barberServiceIds.join(","),
      }),
    enabled:
      authQueryEnabled(
        (params.enabled ?? true) &&
          params.barber > 0 &&
          params.date.length > 0 &&
          params.barberServiceIds.length > 0,
      ),
  });
}

export function useIndependentAvailabilityMonth(params: {
  barber: number;
  year: number;
  month: number;
  barberServiceIds?: number[];
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["barbers", "availability-month", params],
    queryFn: () =>
      fetchIndependentAvailabilityMonth({
        barber: params.barber,
        year: params.year,
        month: params.month,
        barber_service_ids: params.barberServiceIds?.length
          ? params.barberServiceIds.join(",")
          : undefined,
      }),
    enabled: authQueryEnabled((params.enabled ?? true) && params.barber > 0),
    staleTime: 60_000,
  });
}
