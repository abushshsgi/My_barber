import { bookings, userReviews } from "@/lib/mock-data";

export type ProfileStats = {
  bookingsCount: number;
  reviewsCount: number;
  favoritesCount: number;
  upcomingCount: number;
};

const FAVORITES_KEY = "mysaloon.favorites";

function readFavoriteSalonCount(): number {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

/** Mock API — backend tayyor bo'lganda shu interfeys saqlanadi. */
export async function fetchProfileStats(): Promise<ProfileStats> {
  await new Promise((r) => setTimeout(r, 280));

  const now = Date.now();
  const upcomingCount = bookings.filter(
    (b) => new Date(b.date).getTime() >= now && b.status !== "cancelled",
  ).length;

  return {
    bookingsCount: bookings.length,
    reviewsCount: userReviews.length,
    favoritesCount: readFavoriteSalonCount(),
    upcomingCount,
  };
}
