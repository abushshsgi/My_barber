import { useMemo } from "react";
import { resolveAiStyleAudience, useAudience } from "@/hooks/use-audience";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { useHairstyles } from "@/hooks/use-hairstyles";
import { useUserAgeGroup } from "@/hooks/use-me";
import { hasPersonaStyleAsset } from "@/lib/explore-personas";

export function useExplorePageData() {
  const { profileDefault } = useAudience();
  const audience = resolveAiStyleAudience(profileDefault, "all");
  const ageGroup = useUserAgeGroup();
  const { personaId, setPersonaId } = useExplorePersona();
  const menPersona = audience === "men" ? personaId : null;
  const { data: list = [], isLoading, isError } = useHairstyles(audience, menPersona);

  const visibleList = useMemo(() => {
    return list.filter((entry) => {
      if (entry.audience !== "men") return true;
      return hasPersonaStyleAsset(personaId, entry.slug);
    });
  }, [list, personaId]);

  return {
    audience,
    ageGroup,
    personaId,
    setPersonaId,
    menPersona,
    visibleList,
    isLoading,
    isError,
  };
}
