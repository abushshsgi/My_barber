import { useMemo } from "react";
import { useRegions } from "@/hooks/use-regions";
import { useDiscoveryLocation } from "@/hooks/use-discovery-location";
import { useMe } from "@/hooks/use-me";
import { hasValidUserSession } from "@/lib/api/client";
import { buildRecommendContext, type RecommendContext } from "@/lib/recommendations";

/**
 * Tavsiya va masofa: login profili, aks holda GPS discovery (mehmon / yangi user).
 */
export function useRecommendContext(): RecommendContext {
  const discovery = useDiscoveryLocation();
  const { data: me } = useMe();
  const { data: regions = [] } = useRegions();

  return useMemo(() => {
    if (hasValidUserSession() && me) {
      const fromProfile = buildRecommendContext(me, regions);
      if (fromProfile.lat != null && fromProfile.lng != null) return fromProfile;
      if (fromProfile.region) return fromProfile;
    }

    if (discovery.lat != null && discovery.lng != null) {
      return {
        lat: discovery.lat,
        lng: discovery.lng,
        region: discovery.region,
        regionLabel: discovery.regionLabel,
      };
    }

    if (hasValidUserSession() && me) {
      return buildRecommendContext(me, regions);
    }
    return {};
  }, [me, regions, discovery]);
}
