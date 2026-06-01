import { useNavigate, useRouter } from "@tanstack/react-router";
import { bookings, userProfile } from "@/lib/mock-data";
import { useAudience } from "@/hooks/use-audience";
import { useBookings } from "@/hooks/use-user-data";
import { useProfileStats } from "@/hooks/use-profile-stats";
import { getUpcomingBookings } from "@/lib/bookings-utils";
import { getAuthUser, logout } from "@/lib/auth";

export function useProfileScreen() {
  const navigate = useNavigate();
  const router = useRouter();
  const { audience } = useAudience();
  const { stats, loading } = useProfileStats();
  const bookingsQuery = useBookings();
  const realUser = getAuthUser();
  const profile = realUser
    ? {
        ...userProfile,
        name: realUser.name || realUser.email,
        phone: realUser.phone || realUser.email,
      }
    : userProfile;
  const sourceBookings = bookingsQuery.data?.bookings ?? bookings;
  const nextBooking = getUpcomingBookings(sourceBookings)[0] ?? null;

  const handleLogout = () => {
    logout();
    void router.invalidate();
    void navigate({ to: "/auth", replace: true });
  };

  return {
    userProfile: profile,
    audience,
    stats,
    loading,
    nextBooking,
    handleLogout,
  };
}
