import { useQuery } from "@tanstack/react-query";

import { fetchExplorePersonas } from "@/lib/api/explore-personas";
import { EXPLORE_PERSONAS, listReadyExplorePersonas } from "@/lib/explore-personas";

export function useExplorePersonas() {
  return useQuery({
    queryKey: ["explore-personas"],
    queryFn: fetchExplorePersonas,
    staleTime: 60_000,
    placeholderData: listReadyExplorePersonas().map((persona) => ({
      ...persona,
      reference_url: `/hairstyles/men/personas/${persona.id}/reference.webp`,
    })),
  });
}

export function useExplorePersonaList() {
  const query = useExplorePersonas();
  const personas = query.data?.length ? query.data : EXPLORE_PERSONAS.map((persona) => ({
    ...persona,
    reference_url: `/hairstyles/men/personas/${persona.id}/reference.webp`,
  }));
  return { ...query, personas };
}
