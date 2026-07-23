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

type UseHairstylesOptions = {
  /** Home trending kabi joylarda barqaror /hairstyles/{audience}/{slug}.webp yo'llari */
  ignoreAgeGroup?: boolean;
  enabled?: boolean;
};

export function useHairstyles(
  audience?: AudienceFilter,
  personaId?: ExplorePersonaId | null,
  options?: UseHairstylesOptions,
) {
  const profileAgeGroup = useUserAgeGroup();
  const ageGroup = options?.ignoreAgeGroup ? null : profileAgeGroup;
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: hairstylesQueryKey(audience, ageGroup, personaId),
    queryFn: async () => {
      const rows = await fetchHairstyles(audienceParam(audience), ageGroup, personaId ?? undefined);
      return rows.map(mapApiHairstyle);
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useHairstyle(
  styleId: string,
  personaId?: ExplorePersonaId | null,
  options?: { enabled?: boolean },
) {
  const ageGroup = useUserAgeGroup();
  return useQuery({
    queryKey: ["hairstyles", "detail", styleId, ageGroup ?? "any", personaId ?? "none"] as const,
    queryFn: async () =>
      mapApiHairstyle(await fetchHairstyleById(styleId, ageGroup, personaId ?? undefined)),
    staleTime: 10 * 60 * 1000,
    enabled: options?.enabled ?? Boolean(styleId),
  });
}

export function findHairstyleInList(
  list: HairstyleEntry[] | undefined,
  styleId: string,
): HairstyleEntry | undefined {
  return list?.find((entry) => entry.id === styleId);
}
