import { useEffect, useMemo, useState } from "react";
import type { Category } from "@/lib/mock-data";
import { offers, trendingStyles } from "@/lib/mock-data";
import {
  audienceToCategory,
  categoriesForAudience,
  matchAudience,
  useAudience,
} from "@/hooks/use-audience";
import { useSalonsList } from "@/hooks/use-salons";

export function useHomeData() {
  const { audience } = useAudience();
  const { data: salons = [], isLoading, error } = useSalonsList();
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

  const trending = useMemo(
    () => trendingStyles.filter((x) => matchAudience(x.audience, audience)),
    [audience],
  );

  const topOffer = useMemo(
    () => offers.find((o) => matchAudience(o.audience, audience)),
    [audience],
  );

  const featuredSalons = useMemo(() => filtered.slice(0, 4), [filtered]);

  return {
    audience,
    cat,
    setCat,
    query,
    setQuery,
    effectiveCat,
    visibleCategoryKeys,
    filtered,
    trending,
    topOffer,
    featuredSalons,
    loading: isLoading,
    error,
  };
}

export type HomeData = ReturnType<typeof useHomeData>;
