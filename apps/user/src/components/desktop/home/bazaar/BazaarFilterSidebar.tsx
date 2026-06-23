import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, SlidersHorizontal, Sparkles, Star, Tag } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import type { HomeData } from "@/components/home/useHomeData";
import {
  DEFAULT_HOME_SIDEBAR_FILTERS,
  countActiveHomeFilters,
  type HomeSidebarFilters,
  type HomeSort,
} from "@/lib/home-filters";
import type { MapDistanceMax, MapPriceBucket, MapRatingMin } from "@/lib/map-filters";
import { cn } from "@/lib/utils";

type FilterProps = Pick<
  HomeData,
  "query" | "setQuery" | "effectiveCat" | "visibleCategoryKeys" | "setCat" | "sidebarFilters" | "setSidebarFilters"
>;

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-2 text-[12px] font-semibold transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-foreground hover:border-foreground/30 hover:bg-surface",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function BazaarFilterSidebar({
  query,
  setQuery,
  effectiveCat,
  visibleCategoryKeys,
  setCat,
  sidebarFilters,
  setSidebarFilters,
}: FilterProps) {
  const { t } = useTranslation();
  const activeCount = countActiveHomeFilters(sidebarFilters);

  const patch = (next: Partial<HomeSidebarFilters>) => {
    setSidebarFilters({ ...sidebarFilters, ...next });
  };

  const ratingOptions: { id: MapRatingMin; label: string }[] = [
    { id: "any", label: t("map.filters.rating.any") },
    { id: "4.5", label: t("map.filters.rating.4_5") },
    { id: "4.0", label: t("map.filters.rating.4_0") },
  ];

  const distanceOptions: { id: MapDistanceMax; label: string }[] = [
    { id: "any", label: t("map.filters.distance.any") },
    { id: "1", label: t("map.filters.distance.1km") },
    { id: "3", label: t("map.filters.distance.3km") },
    { id: "5", label: t("map.filters.distance.5km") },
  ];

  const priceOptions: { id: MapPriceBucket; label: string }[] = [
    { id: "any", label: t("map.filters.price.any") },
    { id: "under100", label: t("map.filters.price.under100") },
    { id: "100-200", label: t("map.filters.price.100-200") },
    { id: "200-500", label: t("map.filters.price.200-500") },
  ];

  const sortOptions: { id: HomeSort; label: string }[] = [
    { id: "recommended", label: t("home.filters.sort.recommended") },
    { id: "rating", label: t("home.filters.sort.rating") },
    { id: "distance", label: t("home.filters.sort.distance") },
    { id: "price", label: t("home.filters.sort.price") },
  ];

  const quickLinks = [
    { to: "/map", label: t("nav.map"), icon: MapPin },
    { to: "/top", label: t("home.topSalons.title"), icon: Star },
    { to: "/offers", label: t("nav.offers"), icon: Tag },
    { to: "/today", label: t("nav.today"), icon: Calendar },
  ] as const;

  return (
    <div className="w-full min-w-[280px] rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-base font-bold">
          <SlidersHorizontal className="h-4 w-4" />
          {t("home.filters.title")}
        </p>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={() => setSidebarFilters(DEFAULT_HOME_SIDEBAR_FILTERS)}
            className="text-[11px] font-bold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {t("map.filters.clear")}
          </button>
        ) : null}
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("common.search")}
        className="mt-4 w-full rounded-xl border border-border bg-surface/60 px-3.5 py-3 text-sm focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
      />

      <div className="mt-5 space-y-5">
        <FilterSection title={t("settings.preferredAudience")}>
          <AudienceSwitch variant="compact" showProfileHint={false} />
        </FilterSection>

        <FilterSection title={t("map.filters.categoryTitle")}>
          <div className="space-y-1.5">
            {visibleCategoryKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCat(key)}
                className={cn(
                  "flex w-full items-center rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition-colors",
                  effectiveCat === key
                    ? "bg-foreground text-background shadow-sm"
                    : "text-foreground hover:bg-surface",
                )}
              >
                {t(`home.categories.${key}`)}
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title={t("map.filters.ratingTitle")}>
          <div className="flex flex-wrap gap-2">
            {ratingOptions.map((opt) => (
              <FilterChip
                key={opt.id}
                active={sidebarFilters.ratingMin === opt.id}
                onClick={() => patch({ ratingMin: opt.id })}
              >
                {opt.label}
              </FilterChip>
            ))}
          </div>
        </FilterSection>

        <FilterSection title={t("map.filters.distanceTitle")}>
          <div className="flex flex-wrap gap-2">
            {distanceOptions.map((opt) => (
              <FilterChip
                key={opt.id}
                active={sidebarFilters.distanceMax === opt.id}
                onClick={() => patch({ distanceMax: opt.id })}
              >
                {opt.label}
              </FilterChip>
            ))}
          </div>
        </FilterSection>

        <FilterSection title={t("map.filters.priceTitle")}>
          <div className="flex flex-wrap gap-2">
            {priceOptions.map((opt) => (
              <FilterChip
                key={opt.id}
                active={sidebarFilters.price === opt.id}
                onClick={() => patch({ price: opt.id })}
              >
                {opt.label}
              </FilterChip>
            ))}
          </div>
        </FilterSection>

        <FilterSection title={t("map.filters.moreTitle")}>
          <FilterChip
            active={sidebarFilters.guestFavorite}
            onClick={() => patch({ guestFavorite: !sidebarFilters.guestFavorite })}
            className="w-full justify-center"
          >
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {t("map.filters.guestFavorite")}
            </span>
          </FilterChip>
        </FilterSection>

        <FilterSection title={t("home.filters.sortTitle")}>
          <div className="flex flex-wrap gap-2">
            {sortOptions.map((opt) => (
              <FilterChip
                key={opt.id}
                active={sidebarFilters.sort === opt.id}
                onClick={() => patch({ sort: opt.id })}
              >
                {opt.label}
              </FilterChip>
            ))}
          </div>
        </FilterSection>

        <FilterSection title={t("home.filters.quickLinks")}>
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface/40 px-3 py-2.5 text-[12px] font-bold transition-colors hover:border-foreground/30 hover:bg-surface"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </div>
        </FilterSection>
      </div>
    </div>
  );
}
