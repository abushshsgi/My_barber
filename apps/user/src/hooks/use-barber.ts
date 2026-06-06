import { useQuery } from "@tanstack/react-query";
import { fetchBarberByBarberId, fetchIndependentAvailability } from "@/lib/api/barbers";

export function useBarberByBarberId(barberId: string) {
  return useQuery({
    queryKey: ["barbers", "by-barber-id", barberId],
    queryFn: () => fetchBarberByBarberId(barberId),
    enabled: Boolean(barberId),
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
      (params.enabled ?? true) &&
      params.barber > 0 &&
      params.date.length > 0 &&
      params.barberServiceIds.length > 0,
  });
}
