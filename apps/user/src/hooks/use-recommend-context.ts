import { useMemo } from "react";
import { useRegions } from "@/hooks/use-regions";
import { useMe } from "@/hooks/use-me";
import { hasValidUserSession } from "@/lib/api/client";
import { buildRecommendContext, type RecommendContext } from "@/lib/recommendations";

/**
 * Faqat login profili (coords / region) — tavsiya va yaqin masofa uchun.
 * Mehmon GPS discovery o‘chirilgan: mehmonlar butun UZ katalogini ko‘radi.
 */
export function useRecommendContext(): RecommendContext {
  const { data: me } = useMe();
  const { data: regions = [] } = useRegions();

  return useMemo(() => {
    if (!hasValidUserSession()) return {};
    return buildRecommendContext(me, regions);
  }, [me, regions]);
}
