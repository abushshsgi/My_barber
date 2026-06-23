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
import { BazaarSalonRowSection, BazaarSalonRowSectionSkeleton } from "./bazaar/BazaarSalonRowSection";
import {
  HOME_CATEGORY_ROW_AFTER,
  buildHomeSalonSections,
} from "@/lib/home-sections";

type Props = { data: HomeData };
type Salon = HomeData["filtered"][number];

const BAZAAR_ROW_CLASS =
  "grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,320px)_repeat(3,minmax(0,1fr))_minmax(260px,320px)] lg:items-start lg:gap-x-4 lg:[--bazaar-card-w:calc((100%-320px-320px-4*1rem)/3)]";
const CENTER_COLS = ["lg:col-start-2", "lg:col-start-3", "lg:col-start-4"] as const;

function SalonGridCells({ salons }: { salons: Salon[] }) {
  return (
    <>
      {salons.map((salon, index) => (
        <div key={salon.id} className={cn("min-w-0", CENTER_COLS[index])}>
          <DesktopSalonCard salon={salon} variant="marketplace" />
        </div>
      ))}
    </>
  );
}

export function HomeBazaarClassic({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, mapSalons, loading } = data;
  const topRowSalons = filtered.slice(0, 3);
  const salonSections = useMemo(() => buildHomeSalonSections(filtered), [filtered]);

  return (
    <div className="flex w-full flex-col gap-6 px-[150px]">
      <BazaarHeroBanner />

      <div className="flex w-full flex-col gap-4">
        <div className={BAZAAR_ROW_CLASS}>
          <div className="self-start lg:sticky lg:top-[5.75rem] lg:col-start-1 lg:max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto lg:pr-1">
            <BazaarPageTitle title={t("home.nearby")} count={filtered.length} className="mb-4" />
            <BazaarFilterSidebar {...data} />
          </div>

          {loading ? (
            <div className="min-w-0 lg:col-span-3 lg:col-start-2">
              <BazaarGridSkeleton cols={3} />
            </div>
          ) : (
            <SalonGridCells salons={topRowSalons} />
          )}

          <div className="self-start lg:col-start-5">
            <BazaarMapPanel salons={mapSalons} />
          </div>
        </div>

        {salonSections.map((section, index) => (
          <div key={section.id}>
            <div className={BAZAAR_ROW_CLASS}>
              {loading ? (
                <BazaarSalonRowSectionSkeleton />
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
