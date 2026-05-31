import { useNavigate, useRouter } from "@tanstack/react-router";
import { bookings, userProfile } from "@/lib/mock-data";
import { useAudience } from "@/hooks/use-audience";
import { useProfileStats } from "@/hooks/use-profile-stats";
import { getUpcomingBookings } from "@/lib/bookings-utils";
import { logout } from "@/lib/auth";

export function useProfileScreen() {
  const navigate = useNavigate();
  const router = useRouter();
  const { audience } = useAudience();
  const { stats, loading } = useProfileStats();
  const nextBooking = getUpcomingBookings(bookings)[0] ?? null;

  const handleLogout = () => {
    logout();
    void router.invalidate();
    void navigate({ to: "/auth", replace: true });
  };

  return {
    userProfile,
    audience,
    stats,
    loading,
    nextBooking,
    handleLogout,
  };
}
