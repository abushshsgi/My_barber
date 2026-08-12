import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  fetchNotifications,
  type ApiNotification,
} from "../api/user";
import {
  fetchProfileDashboard,
  fetchProfileDashboardFallback,
  type ProfileDashboard,
} from "../api/dashboard";

export type ProfileDashboardState = {
  dashboard: ProfileDashboard | null;
  notifications: ApiNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

export function useProfileDashboard(): ProfileDashboardState {
  const [dashboard, setDashboard] = useState<ProfileDashboard | null>(null);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);

      void (async () => {
        try {
          let payload: ProfileDashboard;
          try {
            payload = await fetchProfileDashboard();
          } catch {
            payload = await fetchProfileDashboardFallback();
          }
          if (cancelled) return;
          setDashboard(payload);
          const notes = await fetchNotifications().catch(() => [] as ApiNotification[]);
          if (cancelled) return;
          setNotifications(notes);
        } catch (err) {
          if (cancelled) return;
          setDashboard(null);
          setNotifications([]);
          setError(err instanceof Error ? err.message : "Profil yuklanmadi");
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [tick]),
  );

  const unreadCount = notifications.filter((n) => !(n.is_read ?? n.read)).length;

  return {
    dashboard,
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
  };
}
