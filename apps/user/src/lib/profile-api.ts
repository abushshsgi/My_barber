import { fetchBookings } from "@/lib/api/bookings";
import { fetchFavoriteSalons } from "@/lib/api/favorites";
import { fetchMyReviews } from "@/lib/api/reviews";

export type ProfileStats = {
  bookingsCount: number;
  reviewsCount: number;
  favoritesCount: number;
  upcomingCount: number;
};

/** Haqiqiy API — profil statistikasi. */
export async function fetchProfileStats(): Promise<ProfileStats> {
  const [bookings, favorites, reviews] = await Promise.all([
    fetchBookings(),
    fetchFavoriteSalons(),
    fetchMyReviews().catch(() => []),
  ]);

  const now = Date.now();
  const upcomingCount = bookings.filter(
    (b) => new Date(b.start_at).getTime() >= now && b.status !== "cancelled",
  ).length;

  return {
    bookingsCount: bookings.length,
    reviewsCount: reviews.length,
    favoritesCount: favorites.count,
    upcomingCount,
  };
}
