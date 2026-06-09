import { useEffect, useState } from "react";
import { fetchProfileStats, type ProfileStats } from "@/lib/profile-api";
import { hasValidUserSession } from "@/lib/api/client";
import { useMe } from "@/hooks/use-me";

export function useProfileStats() {
  const { data: me } = useMe();
  const userId = me?.id;
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !hasValidUserSession()) {
      setStats(null);
      setLoading(false);
      return;
    }

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
  }, [userId]);

  const refresh = () => {
    if (!userId || !hasValidUserSession()) return;
    setLoading(true);
    fetchProfileStats()
      .then(setStats)
      .finally(() => setLoading(false));
  };

  return { stats, loading, refresh };
}
