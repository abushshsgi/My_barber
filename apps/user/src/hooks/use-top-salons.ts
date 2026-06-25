import { useMemo } from "react";
import { useRecommendContext } from "@/hooks/use-recommend-context";
import { useSalonsList, useSalonsNearby } from "@/hooks/use-salons";
import { rankSalonsForUser } from "@/lib/recommendations";
import { filterTopSalons } from "@/lib/salon-top";

export function useTopSalons() {
  const ctx = useRecommendContext();
  const hasCoords = ctx.lat != null && ctx.lng != null;
  const { data: nearbySalons = [], isLoading: nearbyLoading } = useSalonsNearby(
    hasCoords ? ctx.lat! : undefined,
    hasCoords ? ctx.lng! : undefined,
    25,
  );
  const { data: listSalons = [], isLoading: listLoading, error } = useSalonsList();

  const salons = useMemo(() => {
    const base =
      hasCoords && nearbySalons.length > 0 ? nearbySalons : listSalons;
    return filterTopSalons(rankSalonsForUser(base, ctx));
  }, [hasCoords, nearbySalons, listSalons, ctx]);

  return {
    salons,
    loading: nearbyLoading || listLoading,
    error,
  };
}
