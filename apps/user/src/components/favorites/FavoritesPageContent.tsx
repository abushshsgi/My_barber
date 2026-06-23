import { Link } from "@tanstack/react-router";
import { Award, Heart, Sparkles, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { ProfileSubpageCard } from "@/components/profile/ProfileSubpageLayout";
import { SalonCard } from "@/components/SalonCard";
import { PagePillTabs } from "@/components/ui/PagePillTabs";
import { PageSpotlightEmpty } from "@/components/ui/PageSpotlightEmpty";
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

type TabsProps = {
  tab: FavoritesTab;
  onTabChange: (tab: FavoritesTab) => void;
  salonCount?: number;
};

export function FavoritesTabs({ tab, onTabChange, salonCount }: TabsProps) {
  const { t } = useTranslation();
  const tabs = [
    { id: "salons" as const, label: t("favorites.tabs.salons", { defaultValue: "Salonlar" }), count: salonCount },
    { id: "stylists" as const, label: t("favorites.tabs.stylists", { defaultValue: "Ustalar" }) },
  ];

  return <PagePillTabs tabs={tabs} value={tab} onChange={onTabChange} />;
}

function BrowseSalonsButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-3.5 text-sm font-bold text-background transition-transform active:scale-[0.98] hover:opacity-95",
        className,
      )}
    >
      <Sparkles className="h-4 w-4" />
      {t("favorites.browseSalons", { defaultValue: "Salonlarni topish" })}
    </Link>
  );
}

export function FavoriteSalonsPanel({ variant = "mobile" }: { variant?: "mobile" | "desktop" }) {
  const { t } = useTranslation();
  const { ids, loading: favLoading } = useFavorites();
  const { data: favs = [], isLoading } = useSalonsByIds(ids);
  const loading = favLoading || isLoading;

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-56 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
    );
  }

  if (favs.length === 0) {
    return (
      <PageSpotlightEmpty
        icon={Heart}
        tone="warm"
        title={t("favorites.empty")}
        description={t("favorites.emptyHint", {
          defaultValue: "Yoqtirgan salonlaringizni saqlang — keyin bir bosishda qayta topasiz.",
        })}
        action={<BrowseSalonsButton />}
      />
    );
  }

  if (variant === "desktop") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {favs.map((salon) => (
          <DesktopSalonCard key={salon.id} salon={salon} variant="grid" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
      <PageSpotlightEmpty
        icon={Award}
        tone="cool"
        title={t("favoriteStylists.empty")}
        description={t("favoriteStylists.emptyHint")}
        action={
          <Link
            to="/explore"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-3.5 text-sm font-bold text-background transition-transform active:scale-[0.98] hover:opacity-95"
          >
            <Star className="h-4 w-4" />
            {t("favoriteStylists.browse")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {favoriteStylists.map((stylist) => (
        <Link key={stylist.id} to="/salon/$id" params={{ id: stylist.salonId }}>
          <ProfileSubpageCard className="flex items-center gap-3 transition-transform hover:border-foreground/20 active:scale-[0.99]">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-foreground text-sm font-bold text-background">
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
