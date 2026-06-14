import { useQuery } from "@tanstack/react-query";
import type { AudienceFilter } from "@/hooks/use-audience";
import { useUserAgeGroup } from "@/hooks/use-me";
import type { ExplorePersonaId } from "@/lib/explore-personas";
import { fetchHairstyleById, fetchHairstyles } from "@/lib/api/hairstyles";
import { mapApiHairstyle, type HairstyleEntry } from "@/lib/hairstyles/catalog";

export function hairstylesQueryKey(
  audience?: AudienceFilter,
  ageGroup?: string | null,
  personaId?: ExplorePersonaId | null,
) {
  if (!audience || audience === "all") {
    return ["hairstyles", "all", ageGroup ?? "any", personaId ?? "none"] as const;
  }
  return ["hairstyles", audience, ageGroup ?? "any", personaId ?? "none"] as const;
}

function audienceParam(audience?: AudienceFilter): "men" | "women" | undefined {
  if (audience === "men" || audience === "women") return audience;
  return undefined;
}

export function useHairstyles(audience?: AudienceFilter, personaId?: ExplorePersonaId | null) {
  const ageGroup = useUserAgeGroup();
  return useQuery({
    queryKey: hairstylesQueryKey(audience, ageGroup, personaId),
    queryFn: async () => {
      const rows = await fetchHairstyles(audienceParam(audience), ageGroup, personaId ?? undefined);
      return rows.map(mapApiHairstyle);
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useHairstyle(styleId: string, personaId?: ExplorePersonaId | null) {
  const ageGroup = useUserAgeGroup();
  return useQuery({
    queryKey: ["hairstyles", "detail", styleId, ageGroup ?? "any", personaId ?? "none"] as const,
    queryFn: async () =>
      mapApiHairstyle(await fetchHairstyleById(styleId, ageGroup, personaId ?? undefined)),
    staleTime: 10 * 60 * 1000,
  });
}

export function findHairstyleInList(
  list: HairstyleEntry[] | undefined,
  styleId: string,
): HairstyleEntry | undefined {
  return list?.find((entry) => entry.id === styleId);
}
