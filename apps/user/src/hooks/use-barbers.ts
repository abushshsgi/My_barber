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

/** Viloyat / butun UZ katalogi — GPS bo'lmasa ham ishlaydi. */
export function useBarbersList(region?: string | null, enabled = true, scope?: string | null) {
  const regionKey = region?.trim() || "all";
  const scopeKey = scope?.trim() || "";
  return useQuery({
    queryKey: [...barbersQueryKey, "list", regionKey, scopeKey],
    queryFn: async () => {
      try {
        const params: { region?: string; scope?: string } = {};
        if (scope?.trim()) params.scope = scope.trim();
        else if (region?.trim()) params.region = region.trim();
        const data = await fetchBarbersList(Object.keys(params).length ? params : undefined);
        return data.map(mapBarberDiscovery);
      } catch {
        return [];
      }
    },
    enabled: catalogQueryEnabled(enabled),
    staleTime: 30_000,
  });
}

export function useBarberFind(
  q: string,
  enabled = true,
  region?: string | null,
  scope?: string | null,
) {
  const regionKey = region?.trim() || "all";
  const scopeKey = scope?.trim() || "";
  return useQuery({
    queryKey: [...barbersQueryKey, "find", q, regionKey, scopeKey],
    queryFn: async () => {
      if (!q.trim()) return [];
      try {
        const params: { region?: string; scope?: string } = {};
        if (scope?.trim()) params.scope = scope.trim();
        else if (region?.trim()) params.region = region.trim();
        const data = await findBarbers(q.trim(), Object.keys(params).length ? params : undefined);
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
