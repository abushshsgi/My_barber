import { useQuery } from "@tanstack/react-query";
import { fetchBarberByBarberId, fetchBarbersList, fetchBarbersNearby, findBarbers } from "@/lib/api/barbers";
import { catalogQueryEnabled } from "@/lib/auth-query";
import { mapBarberDiscovery } from "@/lib/mappers/barber";

export const barbersQueryKey = ["barbers"] as const;

export function useBarbersNearby(lat?: number, lng?: number, radiusKm = 25, enabled = true) {
  return useQuery({
    queryKey: [...barbersQueryKey, "nearby", lat, lng, radiusKm],
    queryFn: async () => {
      if (lat == null || lng == null) return [];
      try {
        const data = await fetchBarbersNearby(lat, lng, radiusKm);
        return data.map(mapBarberDiscovery);
      } catch {
        return [];
      }
    },
    enabled: catalogQueryEnabled(enabled && lat != null && lng != null),
    staleTime: 30_000,
  });
}

/** Viloyat bo'yicha usta katalogi — GPS bo'lmasa ham ishlaydi. */
export function useBarbersList(region?: string | null, enabled = true) {
  return useQuery({
    queryKey: [...barbersQueryKey, "list", region ?? "all"],
    queryFn: async () => {
      try {
        const data = await fetchBarbersList(region ? { region } : undefined);
        return data.map(mapBarberDiscovery);
      } catch {
        return [];
      }
    },
    enabled: catalogQueryEnabled(enabled),
    staleTime: 30_000,
  });
}

export function useBarberFind(q: string, enabled = true) {
  return useQuery({
    queryKey: [...barbersQueryKey, "find", q],
    queryFn: async () => {
      if (!q.trim()) return [];
      try {
        const data = await findBarbers(q.trim());
        return data.map(mapBarberDiscovery);
      } catch {
        return [];
      }
    },
    enabled: catalogQueryEnabled(enabled && q.trim().length >= 1),
    staleTime: 30_000,
  });
}

export function useBarberPublic(barberId: string) {
  return useQuery({
    queryKey: [...barbersQueryKey, "public", barberId],
    queryFn: async () => mapBarberDiscovery(await fetchBarberByBarberId(barberId)),
    enabled: catalogQueryEnabled(Boolean(barberId)),
    staleTime: 60_000,
  });
}
