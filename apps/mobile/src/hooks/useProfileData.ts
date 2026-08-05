import { useCallback, useEffect, useState } from "react";
import {
  displayName,
  fetchBookings,
  fetchFavoriteSalonIds,
  fetchMe,
  fetchNotifications,
  fetchWallet,
  type ApiBooking,
  type ApiNotification,
  type ApiUser,
  type ApiWallet,
} from "../api/user";

export type ProfileData = {
  user: ApiUser | null;
  name: string;
  wallet: ApiWallet | null;
  bookings: ApiBooking[];
  upcomingCount: number;
  historyCount: number;
  favoritesCount: number;
  notifications: ApiNotification[];
  unreadCount: number;
  loading: boolean;
  authed: boolean;
  refresh: () => void;
};

export function useProfileData(): ProfileData {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [wallet, setWallet] = useState<ApiWallet | null>(null);
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        setUser(me);
        setAuthed(true);

        const [w, b, favs, notes] = await Promise.all([
          fetchWallet().catch(() => null),
          fetchBookings().catch(() => [] as ApiBooking[]),
          fetchFavoriteSalonIds().catch(() => []),
          fetchNotifications().catch(() => [] as ApiNotification[]),
        ]);
        if (cancelled) return;
        setWallet(w);
        setBookings(b);
        setFavoritesCount(favs.length);
        setNotifications(notes);
      } catch {
        if (cancelled) return;
        setUser(null);
        setAuthed(false);
        setWallet(null);
        setBookings([]);
        setFavoritesCount(0);
        setNotifications([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  const upcoming = bookings.filter((b) =>
    ["pending", "confirmed", "upcoming", "booked"].includes((b.status || "").toLowerCase()),
  );
  const history = bookings.filter((b) => !upcoming.includes(b));
  const unreadCount = notifications.filter((n) => !(n.is_read ?? n.read)).length;

  return {
    user,
    name: displayName(user),
    wallet,
    bookings,
    upcomingCount: upcoming.length,
    historyCount: history.length,
    favoritesCount,
    notifications,
    unreadCount,
    loading,
    authed,
    refresh,
  };
}
