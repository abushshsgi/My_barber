import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { SalonCard } from "@/components/SalonCard";
import { EmptyState } from "@/components/EmptyState";
import { useFavorites } from "@/hooks/use-favorites";
import { useSalonsByIds } from "@/hooks/use-salons";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Sevimlilar — mysaloon.uz" }] }),
  component: Favorites,
});

function Favorites() {
  const { t } = useTranslation();
  const { ids, loading: favLoading } = useFavorites();
  const { data: favs = [], isLoading } = useSalonsByIds(ids);
  const loading = favLoading || isLoading;

  return (
    <ProfileSubpageLayout title={t("favorites.title")}>
      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
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
        <div className="space-y-5 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0">
          {favs.map((s) => (
            <SalonCard key={s.id} salon={s} horizontal="lg" />
          ))}
        </div>
      )}
    </ProfileSubpageLayout>
  );
}
