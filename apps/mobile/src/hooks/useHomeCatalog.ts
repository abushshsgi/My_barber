import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE } from "../api/client";
import { fetchBarbers, fetchSalons } from "../api/catalog";
import type { ApiBarberPublic, ApiSalonList, HomeListing } from "../api/types";
import { filterTopSalons, mapBarber, mapSalon } from "../lib/mappers";
import { useHomeLayout } from "../theme/layout";

type HomeCatalogState = {
  salons: HomeListing[];
  topSalons: HomeListing[];
  topBarbers: HomeListing[];
  loading: boolean;
  error: string | null;
  apiBase: string;
  refresh: () => void;
};

/** Home katalog — `api.mysaloon.uz` backend. */
export function useHomeCatalog(): HomeCatalogState {
  const { cardImageW } = useHomeLayout();
  const [rawSalons, setRawSalons] = useState<ApiSalonList[]>([]);
  const [rawBarbers, setRawBarbers] = useState<ApiBarberPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [salons, barbers] = await Promise.all([
          fetchSalons({ scope: "nationwide", page_size: 100 }),
          fetchBarbers({ scope: "nationwide", page_size: 100 }),
        ]);
        if (cancelled) return;
        setRawSalons(salons);
        setRawBarbers(barbers);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Yuklashda xato";
        setError(`${msg} (${API_BASE})`);
        setRawSalons([]);
        setRawBarbers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  const salons = useMemo(
    () => rawSalons.map((s) => mapSalon(s, 0, cardImageW)),
    [rawSalons, cardImageW],
  );

  const topSalons = useMemo(
    () => filterTopSalons(salons, rawSalons),
    [salons, rawSalons],
  );

  const topBarbers = useMemo(() => {
    return [...rawBarbers]
      .sort((a, b) => {
        const score = (x: ApiBarberPublic) =>
          x.avatar?.trim() ? 2 : x.work_photos?.length ? 1 : 0;
        return score(b) - score(a);
      })
      .slice(0, 8)
      .map((b) => mapBarber(b, cardImageW));
  }, [rawBarbers, cardImageW]);

  return {
    salons,
    topSalons,
    topBarbers,
    loading,
    error,
    apiBase: API_BASE,
    refresh,
  };
}
