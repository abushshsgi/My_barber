import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE } from "../api/client";
import {
  fetchBarbers,
  fetchBarbersNearby,
  fetchRegions,
  fetchSalons,
  fetchSalonsNearby,
  type ApiRegion,
} from "../api/catalog";
import type { ApiBarberPublic, ApiSalonList, HomeListing } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { getGuestLocation, type GuestLocation } from "../lib/guest";
import { filterTopSalons, mapBarber, mapSalon } from "../lib/mappers";
import { friendlyNetworkError } from "../lib/network-error";
import { useHomeLayout } from "../theme/layout";

type HomeCatalogState = {
  salons: HomeListing[];
  topSalons: HomeListing[];
  topBarbers: HomeListing[];
  regions: ApiRegion[];
  locationLabel: string;
  loading: boolean;
  error: string | null;
  apiBase: string;
  refresh: () => void;
};

function parseCoord(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function regionCode(r: ApiRegion): string {
  return (r.value || r.code || "").trim();
}

function regionLabel(r: ApiRegion): string {
  return (r.label || r.name_uz || r.name || regionCode(r)).trim();
}

/** Home — yaqin salonlar (GPS) → viloyat → butun O‘zbekiston. */
export function useHomeCatalog(): HomeCatalogState {
  const { user } = useAuth();
  const { cardImageW } = useHomeLayout();
  const [rawSalons, setRawSalons] = useState<ApiSalonList[]>([]);
  const [salonDistances, setSalonDistances] = useState<Record<number, number>>({});
  const [rawBarbers, setRawBarbers] = useState<ApiBarberPublic[]>([]);
  const [regions, setRegions] = useState<ApiRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [guest, setGuest] = useState<GuestLocation | null>(null);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    void getGuestLocation().then((loc) => {
      if (alive) setGuest(loc);
    });
    return () => {
      alive = false;
    };
  }, [tick]);

  const lat = parseCoord(user?.latitude) ?? guest?.latitude ?? null;
  const lng = parseCoord(user?.longitude) ?? guest?.longitude ?? null;
  const profileRegion = user?.region?.trim() || guest?.region?.trim() || "";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const regionList = await fetchRegions().catch(() => [] as ApiRegion[]);
        if (cancelled) return;

        let salons: ApiSalonList[] = [];
        let distances: Record<number, number> = {};
        let barbers: ApiBarberPublic[] = [];

        if (lat != null && lng != null) {
          try {
            const [nearbySalons, nearbyBarbers] = await Promise.all([
              fetchSalonsNearby(lat, lng, 40),
              fetchBarbersNearby(lat, lng, 40).catch(() => [] as ApiBarberPublic[]),
            ]);
            if (nearbySalons.length > 0) {
              salons = nearbySalons.map((row) => row.salon);
              distances = Object.fromEntries(
                nearbySalons.map((row) => [row.salon.id, row.distance_km ?? 0]),
              );
            }
            if (nearbyBarbers.length > 0) {
              barbers = nearbyBarbers;
            }
          } catch {
            /* fallback pastga */
          }
        }

        if (salons.length === 0) {
          const salonParams = profileRegion
            ? { region: profileRegion, page_size: 100 }
            : { scope: "nationwide", page_size: 100 };
          const barberParams = profileRegion
            ? { region: profileRegion, page_size: 100 }
            : { scope: "nationwide", page_size: 100 };
          const [listSalons, listBarbers] = await Promise.all([
            fetchSalons(salonParams),
            barbers.length > 0
              ? Promise.resolve(barbers)
              : fetchBarbers(barberParams),
          ]);
          salons = listSalons;
          if (barbers.length === 0) barbers = listBarbers;
        } else if (barbers.length === 0) {
          const barberParams = profileRegion
            ? { region: profileRegion, page_size: 100 }
            : { scope: "nationwide", page_size: 100 };
          barbers = await fetchBarbers(barberParams);
        }

        if (cancelled) return;
        setRawSalons(salons);
        setSalonDistances(distances);
        setRawBarbers(barbers);
        setRegions(regionList);
      } catch (err) {
        if (cancelled) return;
        setError(friendlyNetworkError(err, API_BASE));
        setRawSalons([]);
        setSalonDistances({});
        setRawBarbers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick, lat, lng, profileRegion]);

  const salons = useMemo(
    () =>
      rawSalons.map((s) => mapSalon(s, salonDistances[s.id] ?? 0, cardImageW)),
    [rawSalons, salonDistances, cardImageW],
  );

  const topSalons = useMemo(
    () => filterTopSalons(salons, rawSalons),
    [salons, rawSalons],
  );

  const topBarbers = useMemo(() => {
    return [...rawBarbers]
      .sort((a, b) => {
        const byDist = (a.distance_km ?? 9999) - (b.distance_km ?? 9999);
        if (byDist !== 0 && (a.distance_km != null || b.distance_km != null)) {
          return byDist;
        }
        const score = (x: ApiBarberPublic) =>
          x.avatar?.trim() ? 2 : x.work_photos?.length ? 1 : 0;
        return score(b) - score(a);
      })
      .slice(0, 8)
      .map((b) => mapBarber(b, cardImageW));
  }, [rawBarbers, cardImageW]);

  const locationLabel = useMemo(() => {
    if (lat != null && lng != null) {
      if (profileRegion) {
        const match = regions.find((r) => regionCode(r) === profileRegion);
        if (match) return regionLabel(match);
      }
      return "Yaqiningizda";
    }
    if (profileRegion) {
      const match = regions.find((r) => regionCode(r) === profileRegion);
      if (match) return regionLabel(match);
      return profileRegion;
    }
    const uz = regions.find((r) => /o['’]?zbekiston/i.test(regionLabel(r)));
    if (uz) return regionLabel(uz);
    if (regions.length > 1) return "O'zbekiston";
    return regions[0] ? regionLabel(regions[0]) : "O'zbekiston";
  }, [regions, profileRegion, lat, lng]);

  return {
    salons,
    topSalons,
    topBarbers,
    regions,
    locationLabel,
    loading,
    error,
    apiBase: API_BASE,
    refresh,
  };
}
