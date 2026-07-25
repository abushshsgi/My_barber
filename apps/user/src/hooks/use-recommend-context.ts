import { useMemo } from "react";
import { useDiscoveryLocation } from "@/hooks/use-discovery-location";
import { useRegions } from "@/hooks/use-regions";
import { useMe } from "@/hooks/use-me";
import { hasValidUserSession } from "@/lib/api/client";
import { buildRecommendContext, type RecommendContext } from "@/lib/recommendations";

/** Profil yoki mehmon GPS — tavsiya, yaqin salonlar va km uchun. */
export function useRecommendContext(): RecommendContext {
  const { data: me } = useMe();
  const { data: regions = [] } = useRegions();
  const discovery = useDiscoveryLocation(!hasValidUserSession());

  return useMemo(() => {
    const fromMe = buildRecommendContext(me, regions);
    const hasMeCoords = fromMe.lat != null && fromMe.lng != null;
    if (hasMeCoords) return fromMe;

    const hasDiscovery =
      discovery.lat != null && discovery.lng != null && Number.isFinite(discovery.lat);

    if (hasDiscovery) {
      const region = fromMe.region || discovery.region || null;
      const regionLabel =
        fromMe.regionLabel ||
        discovery.regionLabel ||
        (region ? regions.find((r) => r.value === region)?.label ?? null : null);
      return {
        lat: discovery.lat,
        lng: discovery.lng,
        region,
        regionLabel,
      };
    }

    if (fromMe.region) return fromMe;

    if (discovery.region) {
      return {
        region: discovery.region,
        regionLabel:
          discovery.regionLabel ||
          regions.find((r) => r.value === discovery.region)?.label ||
          null,
      };
    }

    return {};
  }, [me, regions, discovery.lat, discovery.lng, discovery.region, discovery.regionLabel]);
}
