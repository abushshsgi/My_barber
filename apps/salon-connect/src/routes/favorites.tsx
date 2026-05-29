import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { salons } from "@/lib/mock-data";
import { PageHeader } from "@/components/PageHeader";
import { SalonCard } from "@/components/SalonCard";
import { EmptyState } from "@/components/EmptyState";
import { useFavorites } from "@/hooks/use-favorites";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Sevimlilar — mysaloon.uz" }] }),
  component: Favorites,
});

function Favorites() {
  const { t } = useTranslation();
  const { ids } = useFavorites();
  const favs = ids.length > 0 ? salons.filter((s) => ids.includes(s.id)) : [];

  return (
    <div>
      <PageHeader showBack title={t("favorites.title")} />
      <div className="px-5">
        {favs.length === 0 ? (
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
      </div>
    </div>
  );
}
