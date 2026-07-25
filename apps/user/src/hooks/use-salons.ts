import { useQuery } from "@tanstack/react-query";
import { fetchSalon, fetchSalons, fetchSalonsNearby, fetchSalonStaff, searchSalons } from "@/lib/api/salons";
import { authQueryEnabled, catalogQueryEnabled } from "@/lib/auth-query";
import { mapNearbySalon, mapSalonDetail, mapSalonList, mapStaffToBarber } from "@/lib/mappers/salon";

export const salonsQueryKey = ["salons"] as const;

export function useSalonsList(region?: string | null) {
  const regionKey = region?.trim() || "all";
  return useQuery({
    queryKey: [...salonsQueryKey, "list", regionKey],
    queryFn: async () => {
      const data = await fetchSalons(region?.trim() ? { region: region.trim() } : undefined);
      return data.map((s) => mapSalonList(s));
    },
    staleTime: 30_000,
    enabled: catalogQueryEnabled(),
  });
}

export function useSalonDetail(id: string) {
  return useQuery({
    queryKey: [...salonsQueryKey, "detail", id],
    queryFn: async () => mapSalonDetail(await fetchSalon(id)),
    enabled: catalogQueryEnabled(Boolean(id)),
    staleTime: 60_000,
  });
}

export function useSalonsNearby(lat?: number, lng?: number, radiusKm = 25) {
  return useQuery({
    queryKey: [...salonsQueryKey, "nearby", lat, lng, radiusKm],
    queryFn: async () => {
      if (lat == null || lng == null) return [];
      const data = await fetchSalonsNearby(lat, lng, radiusKm);
      return data.map(mapNearbySalon);
    },
    enabled: catalogQueryEnabled(lat != null && lng != null),
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
    enabled: catalogQueryEnabled(q.trim().length >= 2),
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
    enabled: catalogQueryEnabled(ids.length > 0),
  });
}

/** Xarita «Ustalar» tab — har salon uchun staff (limit bilan). */
export function useSalonsStaffMap(salonIds: string[], enabled: boolean) {
  const ids = salonIds.slice(0, 12);
  return useQuery({
    queryKey: [...salonsQueryKey, "staff-map", ids.join(",")],
    queryFn: async () => {
      const entries = await Promise.all(
        ids.map(async (salonId) => {
          const staff = await fetchSalonStaff(salonId);
          return {
            salonId,
            staff: staff.map((row) => mapStaffToBarber(row, salonId)),
          };
        }),
      );
      return Object.fromEntries(entries.map((e) => [e.salonId, e.staff]));
    },
    enabled: authQueryEnabled(enabled && ids.length > 0),
    staleTime: 60_000,
  });
}
