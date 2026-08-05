import { useCallback, useEffect, useState } from "react";
import { fetchBarbers, fetchSalons } from "../api/catalog";
import type { ApiBarberPublic, ApiSalonList, HomeListing } from "../api/types";
import { filterTopSalons, mapBarber, mapSalon } from "../lib/mappers";

type HomeCatalogState = {
  salons: HomeListing[];
  topSalons: HomeListing[];
  topBarbers: HomeListing[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

/** Home katalog — scope/region keyin GPS bilan boyitiladi. */
export function useHomeCatalog(): HomeCatalogState {
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
        setError(err instanceof Error ? err.message : "Yuklashda xato");
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

  const salons = rawSalons.map((s) => mapSalon(s));
  const topSalons = filterTopSalons(salons, rawSalons);
  const topBarbers = [...rawBarbers]
    .sort((a, b) => {
      const score = (x: ApiBarberPublic) => (x.avatar?.trim() ? 2 : x.work_photos?.length ? 1 : 0);
      return score(b) - score(a);
    })
    .slice(0, 8)
    .map(mapBarber);

  return { salons, topSalons, topBarbers, loading, error, refresh };
}
