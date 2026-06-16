import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileSubpageCard, ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { EmptyState } from "@/components/EmptyState";

/** Backend favorite-barbers API hali yo'q. */
const favoriteStylists: Array<{
  id: string;
  name: string;
  role: string;
  salonName: string;
  salonId: string;
  rating: number;
}> = [];

export const Route = createFileRoute("/favorite-stylists")({
  head: () => ({ meta: [{ title: "Sevimli ustalar — mysaloon.uz" }] }),
  component: FavoriteStylistsPage,
});

function FavoriteStylistsPage() {
  const { t } = useTranslation();

  return (
    <ProfileSubpageLayout
      title={t("favoriteStylists.title")}
    >
      {favoriteStylists.length === 0 ? (
        <EmptyState
          icon={<Award className="h-7 w-7" />}
          title={t("favoriteStylists.empty")}
          description={t("favoriteStylists.emptyHint")}
          action={
            <Link to="/explore" className="rounded-2xl bg-foreground px-5 py-3 text-sm font-bold text-background">
              {t("favoriteStylists.browse")}
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {favoriteStylists.map((s) => (
            <Link key={s.id} to="/salon/$id" params={{ id: s.salonId }}>
              <ProfileSubpageCard className="flex items-center gap-3 active:scale-[0.99] transition-transform">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-foreground text-sm font-bold text-background">
                  {s.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{s.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {s.role} · {s.salonName}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-bold">
                    <Star className="h-3 w-3 fill-foreground" strokeWidth={0} />
                    {s.rating.toFixed(1)}
                  </p>
                </div>
              </ProfileSubpageCard>
            </Link>
          ))}
        </div>
      )}
    </ProfileSubpageLayout>
  );
}
