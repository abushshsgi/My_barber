import { Link } from "@tanstack/react-router";
import { Award, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileSubpageCard } from "@/components/profile/ProfileSubpageLayout";
import { EmptyState } from "@/components/EmptyState";
import { SalonCard } from "@/components/SalonCard";
import { useFavorites } from "@/hooks/use-favorites";
import { useSalonsByIds } from "@/hooks/use-salons";
import { cn } from "@/lib/utils";

export type FavoritesTab = "salons" | "stylists";

/** Backend favorite-barbers API hali yo'q. */
const favoriteStylists: Array<{
  id: string;
  name: string;
  role: string;
  salonName: string;
  salonId: string;
  rating: number;
}> = [];

type Props = {
  tab: FavoritesTab;
  onTabChange: (tab: FavoritesTab) => void;
};

export function FavoritesTabs({ tab, onTabChange }: Props) {
  const { t } = useTranslation();
  const tabs: { id: FavoritesTab; label: string }[] = [
    { id: "salons", label: t("favorites.tabs.salons", { defaultValue: "Salonlar" }) },
    { id: "stylists", label: t("favorites.tabs.stylists", { defaultValue: "Ustalar" }) },
  ];

  return (
    <div className="mb-5 flex gap-2">
      {tabs.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onTabChange(item.id)}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-bold transition-colors",
            tab === item.id ? "bg-foreground text-background" : "bg-surface text-muted-foreground",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function FavoriteSalonsPanel() {
  const { t } = useTranslation();
  const { ids, loading: favLoading } = useFavorites();
  const { data: favs = [], isLoading } = useSalonsByIds(ids);
  const loading = favLoading || isLoading;

  if (loading) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;

  if (favs.length === 0) {
    return (
      <EmptyState
        icon={<Star className="h-7 w-7" />}
        title={t("favorites.empty")}
        action={
          <Link to="/explore" className="rounded-2xl bg-foreground px-5 py-3 text-sm font-bold text-background">
            {t("favorites.browseSalons", { defaultValue: "Salonlarni topish" })}
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      {favs.map((salon) => (
        <SalonCard key={salon.id} salon={salon} />
      ))}
    </div>
  );
}

export function FavoriteStylistsPanel() {
  const { t } = useTranslation();

  if (favoriteStylists.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-3">
      {favoriteStylists.map((stylist) => (
        <Link key={stylist.id} to="/salon/$id" params={{ id: stylist.salonId }}>
          <ProfileSubpageCard className="flex items-center gap-3 transition-transform active:scale-[0.99]">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-foreground text-sm font-bold text-background">
              {stylist.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{stylist.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {stylist.role} · {stylist.salonName}
              </p>
              <p className="mt-1 flex items-center gap-1 text-[11px] font-bold">
                <Star className="h-3 w-3 fill-foreground" strokeWidth={0} />
                {stylist.rating.toFixed(1)}
              </p>
            </div>
          </ProfileSubpageCard>
        </Link>
      ))}
    </div>
  );
}
