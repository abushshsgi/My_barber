import { useCallback, useEffect, useState } from "react";
import { fetchSalon, fetchSalonStaff } from "../api/catalog";
import type { SalonDetail } from "../api/types";
import { mapSalonDetail, mapSalonStaff } from "../lib/salon-detail";
import { useHomeLayout } from "../theme/layout";

type State = {
  salon: SalonDetail | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

export function useSalonDetail(salonId: string, distanceKm = 0): State {
  const { cardImageW } = useHomeLayout();
  const [salon, setSalon] = useState<SalonDetail | null>(null);
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
        const [detail, staff] = await Promise.all([
          fetchSalon(salonId),
          fetchSalonStaff(salonId).catch(() => []),
        ]);
        if (cancelled) return;
        const mapped = mapSalonDetail(detail, distanceKm, cardImageW);
        mapped.staff = mapSalonStaff(staff, cardImageW);
        setSalon(mapped);
      } catch (err) {
        if (cancelled) return;
        setSalon(null);
        setError(err instanceof Error ? err.message : "Salon yuklanmadi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [salonId, distanceKm, cardImageW, tick]);

  return { salon, loading, error, refresh };
}
