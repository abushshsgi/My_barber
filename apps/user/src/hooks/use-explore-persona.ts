import { useCallback, useState } from "react";
import {
  DEFAULT_EXPLORE_PERSONA,
  EXPLORE_PERSONA_STORAGE_KEY,
  type ExplorePersonaId,
  normalizeExplorePersonaId,
} from "@/lib/explore-personas";

function readStoredPersona(): ExplorePersonaId {
  if (typeof window === "undefined") return DEFAULT_EXPLORE_PERSONA;
  const stored = window.localStorage.getItem(EXPLORE_PERSONA_STORAGE_KEY);
  return normalizeExplorePersonaId(stored);
}

export function useExplorePersona() {
  const [personaId, setPersonaIdState] = useState<ExplorePersonaId>(readStoredPersona);

  const setPersonaId = useCallback((next: ExplorePersonaId) => {
    setPersonaIdState(next);
    window.localStorage.setItem(EXPLORE_PERSONA_STORAGE_KEY, next);
  }, []);

  return { personaId, setPersonaId };
}
