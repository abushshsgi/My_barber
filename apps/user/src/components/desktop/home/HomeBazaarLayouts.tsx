import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { cn } from "@/lib/utils";
import {
  BazaarFilterSidebar,
  BazaarGridSkeleton,
  BazaarHeroBanner,
  BazaarMapPanel,
  BazaarPageTitle,
} from "./bazaar/BazaarParts";
import { BazaarCategoryStrip } from "./bazaar/BazaarCategoryStrip";
import { BazaarExploreRowSection, BazaarExploreRowSectionSkeleton } from "./bazaar/BazaarExploreRowSection";
import { BazaarSalonRowSection, BazaarSalonRowSectionSkeleton } from "./bazaar/BazaarSalonRowSection";
import {
  HOME_CATEGORY_ROW_AFTER,
  buildHomeSalonSections,
} from "@/lib/home-sections";
import { BAZAAR_ELEVATED_TILE_H, DESKTOP_BAZAAR_INSET } from "@/lib/desktop-bazaar-layout";

type Props = { data: HomeData };
type Salon = HomeData["filtered"][number];

const BAZAAR_ROW_CLASS =
  "grid w-full min-w-0 grid-cols-1 gap-4 overflow-x-clip lg:grid-cols-[minmax(200px,240px)_repeat(3,minmax(0,1fr))_minmax(300px,380px)] lg:items-start lg:gap-x-4 lg:[--bazaar-card-w:calc((100%_-_240px_-_380px_-_4*1rem)_/_3)]";

const BAZAAR_TOP_ROW_CLASS =
  "grid w-full min-w-0 grid-cols-1 gap-4 overflow-x-clip lg:grid-cols-[minmax(200px,220px)_repeat(4,minmax(0,1fr))] lg:items-start lg:gap-x-3 lg:[--bazaar-card-w:calc((100%_-_220px_-_4*0.75rem)_/_4)] lg:[--bazaar-tile-h:calc(var(--bazaar-card-w)*0.75+5rem)]";

const CENTER_COLS = ["lg:col-start-2", "lg:col-start-3", "lg:col-start-4"] as const;

function SalonGridCells({ salons }: { salons: Salon[] }) {
  return (
    <>
      {salons.map((salon, index) => (
        <div key={salon.id} className={cn("min-w-0 overflow-hidden", CENTER_COLS[index])}>
          <div className={BAZAAR_ELEVATED_TILE_H}>
            <DesktopSalonCard salon={salon} variant="marketplace" elevated className="h-full" />
          </div>
        </div>
      ))}
    </>
  );
}

export function HomeBazaarClassic({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, mapSalons, loading, exploreRow } = data;
  const topRowSalons = filtered.slice(0, 3);
  const salonSections = useMemo(() => buildHomeSalonSections(filtered), [filtered]);

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-6 overflow-x-clip", DESKTOP_BAZAAR_INSET)}>
      <BazaarHeroBanner />

      <div className="flex w-full min-w-0 flex-col gap-4 overflow-x-clip">
        <BazaarPageTitle title={t("home.nearby")} count={filtered.length} className="mb-0" />

        <div className={BAZAAR_TOP_ROW_CLASS}>
          <div className="lg:sticky lg:top-[5.75rem] lg:col-start-1">
            <BazaarFilterSidebar {...data} className={cn("w-full", BAZAAR_ELEVATED_TILE_H)} />
          </div>

          {loading ? (
            <div className="min-w-0 overflow-hidden lg:col-span-3 lg:col-start-2">
              <BazaarGridSkeleton cols={3} />
            </div>
          ) : topRowSalons.length === 0 ? (
            <div className="min-w-0 overflow-hidden rounded-2xl bg-surface p-10 text-center lg:col-span-3 lg:col-start-2">
              <p className="text-sm font-bold">{t("homePage.emptyTitle")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("homePage.emptyHint")}</p>
            </div>
          ) : (
            <SalonGridCells salons={topRowSalons} />
          )}

          <div className="min-w-0 overflow-hidden lg:col-start-5">
            <div className={BAZAAR_ELEVATED_TILE_H}>
              <BazaarMapPanel
                salons={mapSalons}
                nearbyCount={filtered.length}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>

        {salonSections.map((section, index) => (
          <div key={section.id}>
            <div className={BAZAAR_ROW_CLASS}>
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
            {!loading && index === HOME_CATEGORY_ROW_AFTER - 1 ? (
              <div className={cn(BAZAAR_ROW_CLASS, "mt-4")}>
                <BazaarCategoryStrip />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
