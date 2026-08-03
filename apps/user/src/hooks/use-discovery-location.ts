import { hasValidUserSession } from "@/lib/api/client";
import {
  readDiscoveryLocation,
  writeDiscoveryLocation,
  type DiscoveryLocation,
} from "@/lib/discovery-location";
import { validateLocation } from "@/lib/api/geo";
import { getAccuratePosition } from "@/lib/native-geolocation";
import { useEffect, useState } from "react";

export type DiscoveryLocationState = {
  lat: number | null;
  lng: number | null;
  region: string | null;
  regionLabel: string | null;
  ready: boolean;
  source: "storage" | "gps" | null;
};

const INITIAL: DiscoveryLocationState = {
  lat: null,
  lng: null,
  region: null,
  regionLabel: null,
  ready: false,
  source: null,
};

function fromStored(loc: DiscoveryLocation): DiscoveryLocationState {
  return {
    lat: loc.lat,
    lng: loc.lng,
    region: loc.region ?? null,
    regionLabel: loc.regionLabel ?? null,
    ready: true,
    source: "storage",
  };
}

/**
 * Login bo‘lmagan foydalanuvchi uchun GPS / saqlangan joylashuv.
 * Login bo‘lsa — profil (`useMe`) asosiy manba; bu hook faqat fallback.
 */
export function useDiscoveryLocation(enabled = true): DiscoveryLocationState {
  const [state, setState] = useState<DiscoveryLocationState>(() => {
    if (!enabled || typeof window === "undefined") return INITIAL;
    const stored = readDiscoveryLocation();
    if (stored) return fromStored(stored);
    if (hasValidUserSession()) return { ...INITIAL, ready: true };
    return INITIAL;
  });

  useEffect(() => {
    if (!enabled) return;
    const stored = readDiscoveryLocation();
    if (stored) {
      setState(fromStored(stored));
      return;
    }
    // Login user — profil coords useAutoLocationSync or useMe orqali keladi.
    if (hasValidUserSession()) {
      setState((s) => ({ ...s, ready: true }));
      return;
    }

    let cancelled = false;

    const apply = (
      lat: number,
      lng: number,
      region: string | null,
      regionLabel: string | null,
      source: "storage" | "gps",
    ) => {
      if (cancelled) return;
      writeDiscoveryLocation({ lat, lng, region, regionLabel });
      setState({ lat, lng, region, regionLabel, ready: true, source });
    };

    void (async () => {
      const stored = readDiscoveryLocation();
      if (stored) {
        apply(
          stored.lat,
          stored.lng,
          stored.region ?? null,
          stored.regionLabel ?? null,
          "storage",
        );
        // Region bo‘sh bo‘lsa — validate bilan to‘ldirish.
        if (!stored.region) {
          try {
            const v = await validateLocation(stored.lat, stored.lng);
            if (!cancelled && v.region_from_gps) {
              apply(
                stored.lat,
                stored.lng,
                v.region_from_gps,
                v.region_from_gps_label || null,
                "storage",
              );
            }
          } catch {
            /* */
          }
        }
        return;
      }

      try {
        const pos = await getAccuratePosition({
          enableHighAccuracy: true,
          desiredAccuracyMeters: 80,
          maxWatchMs: 10_000,
          maximumAge: 60_000,
        });
        if (cancelled) return;
        let region: string | null = null;
        let regionLabel: string | null = null;
        try {
          const v = await validateLocation(pos.lat, pos.lng);
          region = v.region_from_gps || null;
          regionLabel = v.region_from_gps_label || null;
        } catch {
          /* */
        }
        apply(pos.lat, pos.lng, region, regionLabel, "gps");
      } catch {
        if (!cancelled) setState((s) => ({ ...s, ready: true }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
