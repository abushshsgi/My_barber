import { useNavigate, useRouter } from "@tanstack/react-router";
import { useAudience } from "@/hooks/use-audience";
import { useBookings } from "@/hooks/use-bookings-api";
import { useDisplayUser } from "@/hooks/use-me";
import { useProfileStats } from "@/hooks/use-profile-stats";
import { getUpcomingBookings } from "@/lib/bookings-utils";
import { logout } from "@/lib/auth";

export function useProfileScreen() {
  const navigate = useNavigate();
  const router = useRouter();
  const { audience } = useAudience();
  const user = useDisplayUser();
  const { stats, loading: statsLoading } = useProfileStats();
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings();
  const nextBooking = getUpcomingBookings(bookings)[0] ?? null;

  const handleLogout = () => {
    logout();
    void router.invalidate();
    void navigate({ to: "/auth", replace: true });
  };

  return {
    user,
    audience,
    stats,
    loading: statsLoading || bookingsLoading,
    nextBooking,
    handleLogout,
  };
}
