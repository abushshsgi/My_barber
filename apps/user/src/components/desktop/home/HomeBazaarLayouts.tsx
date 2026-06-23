import { useMemo } from "react";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { cn } from "@/lib/utils";
import {
  BazaarFilterSidebar,
  BazaarGridSkeleton,
  BazaarHeroBanner,
  BazaarMapPanel,
} from "./bazaar/BazaarParts";
import { BazaarCategoryStrip } from "./bazaar/BazaarCategoryStrip";
import { BazaarSalonRowSection, BazaarSalonRowSectionSkeleton } from "./bazaar/BazaarSalonRowSection";
import {
  HOME_CATEGORY_ROW_AFTER,
  buildHomeSalonSections,
} from "@/lib/home-sections";
import { DESKTOP_BAZAAR_INSET } from "@/lib/desktop-bazaar-layout";
import { hasValidMapCoords } from "@/lib/map-utils";

type Props = { data: HomeData };
type Salon = HomeData["filtered"][number];

const BAZAAR_ROW_CLASS =
  "grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(200px,240px)_repeat(3,minmax(0,1fr))_minmax(300px,380px)] lg:items-start lg:gap-x-4 lg:[--bazaar-card-w:calc((100%-240px-380px-4*1rem)/3)]";

const BAZAAR_TOP_ROW_CLASS =
  "grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(200px,220px)_repeat(3,minmax(0,1fr))_minmax(280px,340px)] lg:items-stretch lg:gap-x-3 lg:[--bazaar-card-w:calc((100%-220px-340px-3*0.75rem)/3)]";
const CENTER_COLS = ["lg:col-start-2", "lg:col-start-3", "lg:col-start-4"] as const;

function SalonGridCells({ salons }: { salons: Salon[] }) {
  return (
    <>
      {salons.map((salon, index) => (
        <div key={salon.id} className={cn("min-w-0 pb-3", CENTER_COLS[index])}>
          <DesktopSalonCard salon={salon} variant="marketplace" elevated />
        </div>
      ))}
    </>
  );
}

export function HomeBazaarClassic({ data }: Props) {
  const { filtered, loading } = data;
  const topRowSalons = filtered.slice(0, 3);
  const mapPreviewSalons = useMemo(
    () => filtered.filter((s) => hasValidMapCoords(s.lat, s.lng)),
    [filtered],
  );
  const salonSections = useMemo(() => buildHomeSalonSections(filtered), [filtered]);

  return (
    <div className={cn("flex w-full flex-col gap-6", DESKTOP_BAZAAR_INSET)}>
      <BazaarHeroBanner />

      <div className="flex w-full flex-col gap-4">
        <div className={BAZAAR_TOP_ROW_CLASS}>
          <div className="h-full min-h-0 lg:sticky lg:top-[5.75rem] lg:col-start-1 lg:self-stretch">
            <BazaarFilterSidebar {...data} className="h-full" />
          </div>

          {loading ? (
            <div className="min-w-0 lg:col-span-3 lg:col-start-2 lg:self-stretch">
              <BazaarGridSkeleton cols={3} />
            </div>
          ) : (
            <SalonGridCells salons={topRowSalons} />
          )}

          <div className="flex min-h-0 flex-col lg:col-start-5 lg:self-stretch">
            <BazaarMapPanel salons={mapPreviewSalons} className="h-full min-h-[300px] flex-1" />
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
