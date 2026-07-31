import { resolveAiStyleAudience, useAudience } from "@/hooks/use-audience";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { useHairstyles } from "@/hooks/use-hairstyles";
import { useUserAgeGroup } from "@/hooks/use-me";

export function useExplorePageData() {
  const { profileDefault } = useAudience();
  const audience = resolveAiStyleAudience(profileDefault, "all");
  const ageGroup = useUserAgeGroup();
  const { personaId, setPersonaId } = useExplorePersona();
  const menPersona = audience === "men" ? personaId : null;
  const {
    data: list = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useHairstyles(audience, menPersona);

  return {
    audience,
    ageGroup,
    personaId,
    setPersonaId,
    menPersona,
    visibleList: list,
    isLoading,
    isError,
    isRetrying: isFetching && isError,
    retry: () => void refetch(),
  };
}
