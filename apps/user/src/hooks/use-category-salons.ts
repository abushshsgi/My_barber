import { useMemo } from "react";
import type { Category } from "@/lib/mock-data";
import { useRecommendContext } from "@/hooks/use-recommend-context";
import { useSalonsList, useSalonsNearby } from "@/hooks/use-salons";
import { mergeSalonCatalogSources } from "@/lib/merge-salon-catalog";
import { rankSalonsForUser } from "@/lib/recommendations";

export function useCategorySalons(category: Category) {
  const ctx = useRecommendContext();
  const hasCoords = ctx.lat != null && ctx.lng != null;
  const { data: nearbySalons = [], isLoading: nearbyLoading } = useSalonsNearby(
    hasCoords ? ctx.lat! : undefined,
    hasCoords ? ctx.lng! : undefined,
    25,
  );
  const { data: listSalons = [], isLoading: listLoading, error } = useSalonsList();

  const salons = useMemo(() => {
    const base = hasCoords
      ? mergeSalonCatalogSources(nearbySalons, listSalons)
      : listSalons;
    return rankSalonsForUser(base, ctx).filter((salon) => salon.category === category);
  }, [hasCoords, nearbySalons, listSalons, ctx, category]);

  return {
    salons,
    loading: nearbyLoading || listLoading,
    error,
  };
}
