import { useEffect, useMemo, useState } from "react";
import type { Category, Offer } from "@/lib/mock-data";
import { pickTrendingStyles, readTrendingFaceHints } from "@/lib/hairstyles/trending";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { useUserAgeGroup } from "@/hooks/use-me";
import {
  audienceToCategory,
  categoriesForAudience,
  matchAudience,
  useAudience,
} from "@/hooks/use-audience";
import { useHairstyles } from "@/hooks/use-hairstyles";
import { useMe } from "@/hooks/use-me";
import { useSalonsList, useSalonsNearby } from "@/hooks/use-salons";
import { hasValidMapCoords } from "@/lib/map-utils";
import {
  rankSalonsForUser,
  userRecommendContext,
} from "@/lib/recommendations";

export function useHomeData() {
  const { audience } = useAudience();
  const { data: me } = useMe();
  const { personaId } = useExplorePersona();
  const ageGroup = useUserAgeGroup();
  const menPersona = audience === "men" ? personaId : null;
  const { data: hairstyles = [] } = useHairstyles(audience, menPersona, { ignoreAgeGroup: true });
  const ctx = useMemo(() => userRecommendContext(me), [me]);

  const hasCoords = ctx.lat != null && ctx.lng != null;
  const { data: nearbySalons = [], isLoading: nearbyLoading } = useSalonsNearby(
    hasCoords ? ctx.lat! : undefined,
    hasCoords ? ctx.lng! : undefined,
  );
  const { data: listSalons = [], isLoading: listLoading, error } = useSalonsList();

  const salons = useMemo(() => {
    const base = hasCoords && nearbySalons.length > 0 ? nearbySalons : listSalons;
    return rankSalonsForUser(base, ctx);
  }, [hasCoords, nearbySalons, listSalons, ctx]);

  const [cat, setCat] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setCat(audienceToCategory(audience));
  }, [audience]);

  const effectiveCat = useMemo(() => {
    if (audience === "all") return cat;
    const allowed = categoriesForAudience(audience);
    if (allowed.includes(cat)) return cat;
    return audienceToCategory(audience);
  }, [audience, cat]);

  const visibleCategoryKeys = useMemo(
    () => categoriesForAudience(audience),
    [audience],
  );

  const filtered = useMemo(
    () =>
      salons.filter(
        (s) =>
          matchAudience(s.audience, audience) &&
          (effectiveCat === "all" || s.category === effectiveCat) &&
          (query === "" || s.name.toLowerCase().includes(query.toLowerCase())),
      ),
    [salons, audience, effectiveCat, query],
  );

  const trending = useMemo(() => {
    const hints = readTrendingFaceHints();
    return pickTrendingStyles(hairstyles, {
      ...hints,
      ageGroup,
      preferredPersonaId: audience === "men" ? personaId : null,
    });
  }, [hairstyles, ageGroup, personaId, audience]);

  const topOffer = useMemo((): Offer | undefined => undefined, []);

  const featuredSalons = useMemo(() => filtered.slice(0, 4), [filtered]);
  const mapSalons = useMemo(
    () => salons.filter((s) => hasValidMapCoords(s.lat, s.lng)),
    [salons],
  );
  const personalized = hasCoords || Boolean(me?.region);

  return {
    audience,
    cat,
    setCat,
    query,
    setQuery,
    effectiveCat,
    visibleCategoryKeys,
    filtered,
    mapSalons,
    trending,
    topOffer,
    featuredSalons,
    personalized,
    loading: nearbyLoading || listLoading,
    error,
  };
}

export type HomeData = ReturnType<typeof useHomeData>;
