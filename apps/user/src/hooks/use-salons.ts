import { useQuery } from "@tanstack/react-query";
import { fetchSalon, fetchSalons, fetchSalonsNearby, searchSalons } from "@/lib/api/salons";
import { authQueryEnabled } from "@/lib/auth-query";
import { mapNearbySalon, mapSalonDetail, mapSalonList } from "@/lib/mappers/salon";

export const salonsQueryKey = ["salons"] as const;

export function useSalonsList() {
  return useQuery({
    queryKey: [...salonsQueryKey, "list"],
    queryFn: async () => {
      const data = await fetchSalons();
      return data.map((s) => mapSalonList(s));
    },
    staleTime: 30_000,
    enabled: authQueryEnabled(),
  });
}

export function useSalonDetail(id: string) {
  return useQuery({
    queryKey: [...salonsQueryKey, "detail", id],
    queryFn: async () => mapSalonDetail(await fetchSalon(id)),
    enabled: authQueryEnabled(Boolean(id)),
  });
}

export function useSalonsNearby(lat?: number, lng?: number) {
  return useQuery({
    queryKey: [...salonsQueryKey, "nearby", lat, lng],
    queryFn: async () => {
      if (lat == null || lng == null) return [];
      const data = await fetchSalonsNearby(lat, lng);
      return data.map(mapNearbySalon);
    },
    enabled: authQueryEnabled(lat != null && lng != null),
    staleTime: 30_000,
  });
}

export function useSalonSearch(q: string) {
  return useQuery({
    queryKey: [...salonsQueryKey, "search", q],
    queryFn: async () => {
      if (!q.trim()) return [];
      const data = await searchSalons(q.trim());
      return data.map((s) => mapSalonList(s));
    },
    enabled: authQueryEnabled(q.trim().length >= 2),
  });
}

export function useSalonsByIds(ids: string[]) {
  return useQuery({
    queryKey: [...salonsQueryKey, "ids", ids.join(",")],
    queryFn: async () => {
      if (!ids.length) return [];
      const data = await fetchSalons({ ids: ids.join(",") });
      return data.map((s) => mapSalonList(s));
    },
    enabled: authQueryEnabled(ids.length > 0),
  });
}
