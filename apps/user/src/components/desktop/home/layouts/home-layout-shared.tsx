import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import type { Salon } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  BazaarGridSkeleton,
  BazaarPageTitle,
} from "../bazaar/BazaarParts";
import { BazaarCategoryStrip } from "../bazaar/BazaarCategoryStrip";
import { BazaarExploreRowSection, BazaarExploreRowSectionSkeleton } from "../bazaar/BazaarExploreRowSection";
import { BazaarSalonRowSection, BazaarSalonRowSectionSkeleton } from "../bazaar/BazaarSalonRowSection";
import {
  HOME_CATEGORY_ROW_AFTER,
  buildHomeSalonSections,
} from "@/lib/home-sections";
import { BAZAAR_ELEVATED_TILE_H } from "@/lib/desktop-bazaar-layout";

export type HomeLayoutSlice = Pick<
  HomeData,
  "filtered" | "mapSalons" | "loading" | "exploreRow" | "query" | "setQuery" | "effectiveCat" | "visibleCategoryKeys" | "setCat"
>;

export function useHomeLayoutSlice(data: HomeData) {
  const { t } = useTranslation();
  const { filtered, mapSalons, loading, exploreRow } = data;
  const topRowSalons = filtered.slice(0, 3);
  const salonSections = useMemo(() => buildHomeSalonSections(filtered), [filtered]);

  return {
    t,
    filtered,
    mapSalons,
    loading,
    exploreRow,
    topRowSalons,
    salonSections,
  };
}

export function HomeEmptySalons({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn("rounded-2xl bg-surface p-10 text-center", className)}>
      <p className="text-sm font-bold">{t("homePage.emptyTitle")}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t("homePage.emptyHint")}</p>
    </div>
  );
}

export function HomeTopSalonCards({
  salons,
  elevated = true,
  cols = 3,
  className,
}: {
  salons: Salon[];
  elevated?: boolean;
  cols?: 3 | 4 | 5 | 6;
  className?: string;
}) {
  const colClass =
    cols === 6
      ? "lg:grid-cols-6"
      : cols === 5
        ? "lg:grid-cols-5"
        : cols === 4
          ? "lg:grid-cols-4"
          : "lg:grid-cols-3";

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", colClass, className)}>
      {salons.map((salon) => (
        <div key={salon.id} className="min-w-0 overflow-hidden">
          {elevated ? (
            <div className={BAZAAR_ELEVATED_TILE_H}>
              <DesktopSalonCard salon={salon} variant="marketplace" elevated className="h-full" />
            </div>
          ) : (
            <DesktopSalonCard salon={salon} variant="marketplace" />
          )}
        </div>
      ))}
    </div>
  );
}

export function HomeSalonSectionsBlock({
  data,
  rowClass,
  showCategoryStrip = true,
}: {
  data: HomeData;
  rowClass?: string;
  showCategoryStrip?: boolean;
}) {
  const { loading, exploreRow, salonSections } = useHomeLayoutSlice(data);

  return (
    <>
      {salonSections.map((section, index) => (
        <div key={section.id}>
          <div className={rowClass}>
            {loading ? (
              section.variant === "explore" ? (
                <BazaarExploreRowSectionSkeleton />
              ) : (
                <BazaarSalonRowSectionSkeleton />
              )
            ) : section.variant === "explore" ? (
              <BazaarExploreRowSection
                titleKey={section.titleKey}
                styles={exploreRow}
                viewAllTo={section.viewAllTo}
              />
            ) : (
              <BazaarSalonRowSection
                titleKey={section.titleKey}
                salons={section.salons}
                viewAllTo={section.viewAllTo}
              />
            )}
          </div>
          {showCategoryStrip && !loading && index === HOME_CATEGORY_ROW_AFTER - 1 ? (
            <div className={cn(rowClass, "mt-4")}>
              <BazaarCategoryStrip />
            </div>
          ) : null}
        </div>
      ))}
    </>
  );
}

export function HomeNearbyTitle({ count, className }: { count: number; className?: string }) {
  const { t } = useTranslation();
  return <BazaarPageTitle title={t("home.nearby")} count={count} className={className} />;
}

export function HomeTopSalonsBlock({
  loading,
  salons,
  cols = 3,
  skeletonCols = 3,
  className,
}: {
  loading: boolean;
  salons: Salon[];
  cols?: 3 | 4 | 5 | 6;
  skeletonCols?: number;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={className}>
        <BazaarGridSkeleton cols={skeletonCols} />
      </div>
    );
  }
  if (salons.length === 0) {
    return <HomeEmptySalons className={className} />;
  }
  return <HomeTopSalonCards salons={salons} cols={cols} className={className} />;
}
