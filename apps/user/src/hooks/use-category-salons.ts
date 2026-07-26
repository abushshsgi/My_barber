import { useMemo } from "react";
import type { Category } from "@/lib/mock-data";
import { useCatalogScope } from "@/hooks/use-catalog-scope";
import { useRecommendContext } from "@/hooks/use-recommend-context";
import { useSalonsList, useSalonsNearby } from "@/hooks/use-salons";
import { rankSalonsForUser } from "@/lib/recommendations";

export function useCategorySalons(category: Category) {
  const catalog = useCatalogScope();
  const ctx = useRecommendContext();
  const hasCoords = catalog.useNearby && ctx.lat != null && ctx.lng != null;
  const { data: nearbySalons = [], isLoading: nearbyLoading } = useSalonsNearby(
    hasCoords ? ctx.lat! : undefined,
    hasCoords ? ctx.lng! : undefined,
    40,
  );
  const { data: listSalons = [], isLoading: listLoading, error } = useSalonsList(
    catalog.region,
    catalog.apiScope,
  );

  const salons = useMemo(() => {
    const base =
      hasCoords && nearbySalons.length > 0 ? nearbySalons : listSalons;
    return rankSalonsForUser(base, ctx).filter((salon) => salon.category === category);
  }, [hasCoords, nearbySalons, listSalons, ctx, category]);

  return {
    salons,
    loading: nearbyLoading || listLoading,
    error,
  };
}
