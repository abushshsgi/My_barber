import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { salons } from "@/lib/mock-data";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { SalonCard } from "@/components/SalonCard";
import { EmptyState } from "@/components/EmptyState";
import { useFavorites } from "@/hooks/use-favorites";
import { useFavoriteSalons } from "@/hooks/use-user-data";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Sevimlilar — mysaloon.uz" }] }),
  component: Favorites,
});

function Favorites() {
  const { t } = useTranslation();
  const { ids, syncing } = useFavorites();
  const apiFavorites = useFavoriteSalons();
  const favs = syncing
    ? apiFavorites.data || []
    : ids.length > 0
      ? salons.filter((s) => ids.includes(s.id))
      : [];

  return (
    <ProfileSubpageLayout title={t("favorites.title")}>
      {apiFavorites.isLoading ? (
        <div className="space-y-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : favs.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-7 w-7" />}
          title={t("favorites.empty")}
          action={
            <Link
              to="/"
              className="rounded-2xl bg-foreground px-5 py-3 text-sm font-bold text-background"
            >
              Salonlarni topish
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
          {favs.map((s) => (
            <SalonCard key={s.id} salon={s} />
          ))}
        </div>
      )}
    </ProfileSubpageLayout>
  );
}
