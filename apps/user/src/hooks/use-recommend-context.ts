import { useMemo } from "react";
import { useRegions } from "@/hooks/use-regions";
import { useMe } from "@/hooks/use-me";
import { buildRecommendContext, type RecommendContext } from "@/lib/recommendations";

/** Profil + viloyat nomi — tavsiya va xarita uchun. */
export function useRecommendContext(): RecommendContext {
  const { data: me } = useMe();
  const { data: regions = [] } = useRegions();
  return useMemo(() => buildRecommendContext(me, regions), [me, regions]);
}
