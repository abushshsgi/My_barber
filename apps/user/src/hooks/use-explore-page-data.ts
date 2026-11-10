import { resolveAiStyleAudience, useAudience } from "@/hooks/use-audience";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { useWomenExplorePersona } from "@/hooks/use-explore-personas";
import { useHairstyles } from "@/hooks/use-hairstyles";
import { useUserAgeGroup } from "@/hooks/use-me";

export function useExplorePageData() {
  const { profileDefault } = useAudience();
  const audience = resolveAiStyleAudience(profileDefault, "all");
  const ageGroup = useUserAgeGroup();
  const { personaId, setPersonaId } = useExplorePersona();
  const women = useWomenExplorePersona();
  const menPersona = audience === "men" ? personaId : null;
  const stylePersona = audience === "women" ? women.personaId : menPersona;
  const {
    data: list = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useHairstyles(audience, stylePersona);

  return {
    audience,
    ageGroup,
    personaId,
    setPersonaId,
    menPersona,
    womenPersonas: women.personas,
    womenPersonaId: women.personaId,
    setWomenPersonaId: women.setPersonaId,
    visibleList: list,
    isLoading,
    isError,
    isRetrying: isFetching && isError,
    retry: () => void refetch(),
  };
}
