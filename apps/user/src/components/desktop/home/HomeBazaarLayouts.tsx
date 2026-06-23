import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { filterTopSalons } from "@/lib/salon-top";
import { cn } from "@/lib/utils";
import {
  BazaarFilterSidebar,
  BazaarGridSkeleton,
  BazaarHeroBanner,
  BazaarMapPanel,
  BazaarPageTitle,
} from "./bazaar/BazaarParts";
import { BazaarTopSalonsSection, BazaarTopSalonsSectionSkeleton } from "./bazaar/BazaarTopSalonsSection";

type Props = { data: HomeData };
type Salon = HomeData["filtered"][number];

const BAZAAR_ROW_CLASS =
  "grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,280px)_repeat(3,minmax(0,1fr))_minmax(320px,400px)] lg:items-start lg:gap-x-4 lg:[--bazaar-card-w:calc((100%-280px-400px-4*1rem)/3)]";
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
  const topSalons = useMemo(() => filterTopSalons(filtered), [filtered]);

  return (
    <div className="flex w-full flex-col gap-6 px-[150px]">
      <BazaarHeroBanner />

      <div className="flex w-full flex-col gap-4">
        <div className={BAZAAR_ROW_CLASS}>
          <div className="hidden lg:block lg:col-start-1" aria-hidden />
          <div className="lg:col-span-3 lg:col-start-2">
            <BazaarPageTitle title={t("home.nearby")} count={filtered.length} className="mb-0" />
          </div>
          <div className="hidden lg:block lg:col-start-5" aria-hidden />
        </div>

        <div className={BAZAAR_ROW_CLASS}>
          <div className="self-start lg:sticky lg:top-[5.75rem] lg:col-start-1">
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

        <div className={BAZAAR_ROW_CLASS}>
          {loading ? (
            <BazaarTopSalonsSectionSkeleton />
          ) : (
            <BazaarTopSalonsSection salons={topSalons} />
          )}
        </div>
      </div>
    </div>
  );
}
