import { useEffect, useState } from "react";
import { fetchProfileStats, type ProfileStats } from "@/lib/profile-api";

export function useProfileStats() {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchProfileStats()
      .then((data) => {
        if (active) setStats(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const refresh = () => {
    setLoading(true);
    fetchProfileStats()
      .then(setStats)
      .finally(() => setLoading(false));
  };

  return { stats, loading, refresh };
}
