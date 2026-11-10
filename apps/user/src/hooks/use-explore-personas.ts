import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiJson } from "@/lib/api/client";
import { fetchExplorePersonas } from "@/lib/api/explore-personas";
import type { WomenExplorePersona } from "@/components/WomenPersonaPicker";
import { EXPLORE_PERSONAS, listReadyExplorePersonas } from "@/lib/explore-personas";

const WOMEN_PERSONA_KEY = "mysaloon.explore.womenPersona";

export function useWomenExplorePersonas() {
  return useQuery({
    queryKey: ["explore-personas", "women"],
    queryFn: () => apiJson<WomenExplorePersona[]>("/api/v1/explore/personas/?audience=women"),
    staleTime: 60_000,
  });
}

export function useWomenExplorePersona() {
  const query = useWomenExplorePersonas();
  const personas = query.data ?? [];
  const [storedId, setStoredId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(WOMEN_PERSONA_KEY);
  });

  const personaId =
    personas.find((persona) => persona.id === storedId)?.id ?? personas[0]?.id ?? null;

  useEffect(() => {
    if (!personaId || personaId === storedId) return;
    window.localStorage.setItem(WOMEN_PERSONA_KEY, personaId);
  }, [personaId, storedId]);

  const setPersonaId = useCallback((next: string) => {
    setStoredId(next);
    window.localStorage.setItem(WOMEN_PERSONA_KEY, next);
  }, []);

  return { ...query, personas, personaId, setPersonaId };
}

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
  const personas = query.data?.length
    ? query.data
    : EXPLORE_PERSONAS.map((persona) => ({
        ...persona,
        reference_url: `/hairstyles/men/personas/${persona.id}/reference.webp`,
      }));
  return { ...query, personas };
}
