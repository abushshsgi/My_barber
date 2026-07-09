import { useEffect, useMemo, useState } from "react";
import type { Category, Offer } from "@/lib/mock-data";
import {
  pickHomeExploreRowStyles,
  pickTrendingStyles,
  readTrendingFaceHints,
} from "@/lib/hairstyles/trending";
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
import { useRecommendContext } from "@/hooks/use-recommend-context";
import { useSalonsList, useSalonsNearby, useSalonSearch } from "@/hooks/use-salons";
import { useBarberFind, useBarbersList, useBarbersNearby } from "@/hooks/use-barbers";
import { buildMixedDiscoveryItems } from "@/lib/home-discovery";
import { hasValidMapCoords } from "@/lib/map-utils";
import { rankBarbersForUser, rankSalonsForUser } from "@/lib/recommendations";

export function useHomeData() {
  const { audience } = useAudience();
  const { data: me } = useMe();
  const catalogRegion = me?.region?.trim() || undefined;
  const { personaId } = useExplorePersona();
  const ageGroup = useUserAgeGroup();
  const menPersona = audience === "men" ? personaId : null;
  const { data: hairstyles = [] } = useHairstyles(audience, menPersona, { ignoreAgeGroup: true });
  const ctx = useRecommendContext();
  const hasCoords = ctx.lat != null && ctx.lng != null;
  const { data: nearbySalons = [], isLoading: nearbyLoading, isError: nearbyError } = useSalonsNearby(
    hasCoords ? ctx.lat! : undefined,
    hasCoords ? ctx.lng! : undefined,
    25,
  );
  const { data: listSalons = [], isLoading: listLoading, error } = useSalonsList();

  const salons = useMemo(() => {
    const useNearby = hasCoords && !nearbyError && nearbySalons.length > 0;
    const base = useNearby ? nearbySalons : listSalons;
    return rankSalonsForUser(base, ctx);
  }, [hasCoords, nearbyError, nearbySalons, listSalons, ctx]);

  const [cat, setCat] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const searchActive = query.trim().length >= 2;
  const { data: searchSalons = [], isLoading: searchSalonsLoading } = useSalonSearch(
    searchActive ? query : "",
  );
  const { data: searchBarbers = [], isLoading: searchBarbersLoading } = useBarberFind(
    searchActive ? query : "",
    searchActive,
  );
  const { data: nearbyBarbers = [], isLoading: nearbyBarbersLoading } = useBarbersNearby(
    hasCoords ? ctx.lat! : undefined,
    hasCoords ? ctx.lng! : undefined,
    25,
    !searchActive,
  );
  const { data: listBarbers = [], isLoading: listBarbersLoading } = useBarbersList(
    catalogRegion,
    !searchActive,
  );

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

  const filtered = useMemo(() => {
    const source = searchActive ? searchSalons : salons;
    return source.filter(
      (s) =>
        matchAudience(s.audience, audience) &&
        (effectiveCat === "all" || s.category === effectiveCat) &&
        (!searchActive || query === "" || s.name.toLowerCase().includes(query.toLowerCase())),
    );
  }, [salons, searchSalons, searchActive, audience, effectiveCat, query]);

  const browseBarbers = useMemo(() => {
    if (searchActive) return searchBarbers;
    const base = hasCoords && nearbyBarbers.length > 0 ? nearbyBarbers : listBarbers;
    return rankBarbersForUser(base, ctx);
  }, [searchActive, searchBarbers, hasCoords, nearbyBarbers, listBarbers, ctx]);

  const filteredBarbers = browseBarbers;

  const mixedDiscovery = useMemo(
    () => buildMixedDiscoveryItems(filtered.slice(0, 10), browseBarbers.slice(0, 10), 14),
    [filtered, browseBarbers],
  );

  const trending = useMemo(() => {
    const hints = readTrendingFaceHints();
    return pickTrendingStyles(hairstyles, {
      ...hints,
      ageGroup,
      preferredPersonaId: audience === "men" ? personaId : null,
    });
  }, [hairstyles, ageGroup, personaId, audience]);

  const exploreRow = useMemo(() => {
    const hints = readTrendingFaceHints();
    return pickHomeExploreRowStyles(hairstyles, {
      ...hints,
      ageGroup,
      audience,
      preferredPersonaId: audience === "men" ? personaId : null,
    });
  }, [hairstyles, ageGroup, personaId, audience]);

  const topOffer = useMemo((): Offer | undefined => undefined, []);

  const featuredSalons = useMemo(() => filtered.slice(0, 4), [filtered]);
  const mapSalons = useMemo(
    () => salons.filter((s) => hasValidMapCoords(s.lat, s.lng)),
    [salons],
  );
  const mapBarbers = useMemo(
    () => browseBarbers.filter((b) => hasValidMapCoords(b.lat, b.lng)),
    [browseBarbers],
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
    filteredBarbers,
    browseBarbers,
    mixedDiscovery,
    searchActive,
    mapSalons,
    mapBarbers,
    trending,
    exploreRow,
    topOffer,
    featuredSalons,
    personalized,
    loading:
      nearbyLoading ||
      listLoading ||
      nearbyBarbersLoading ||
      listBarbersLoading ||
      (searchActive && (searchSalonsLoading || searchBarbersLoading)),
    error,
  };
}

export type HomeData = ReturnType<typeof useHomeData>;
