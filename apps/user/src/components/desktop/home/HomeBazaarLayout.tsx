import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import {
  BazaarCategoryBrowse,
  BazaarFilterSidebar,
  BazaarGridSkeleton,
  BazaarHeroBanner,
  BazaarMapPanel,
  BazaarPageTitle,
  BazaarWeekendDeals,
  SALON_GRID_CLASS,
} from "./bazaar/BazaarParts";
import { useBazaarSections } from "./bazaar/useBazaarSections";

type Props = { data: HomeData };

const GRID_CARD_COUNT = 12;

const GRID_SLOTS = [
  "lg:col-start-2 lg:row-start-1",
  "lg:col-start-3 lg:row-start-1",
  "lg:col-start-4 lg:row-start-1",
  "lg:col-start-5 lg:row-start-1",
  "lg:col-start-2 lg:row-start-2",
  "lg:col-start-3 lg:row-start-2",
  "lg:col-start-4 lg:row-start-2",
  "lg:col-start-5 lg:row-start-2",
  "lg:col-start-2 lg:row-start-3",
  "lg:col-start-3 lg:row-start-3",
  "lg:col-start-4 lg:row-start-3",
  "lg:col-start-5 lg:row-start-3",
] as const;

function SalonGrid({ salons }: { salons: HomeData["filtered"] }) {
  return (
    <div className={SALON_GRID_CLASS}>
      {salons.map((s) => (
        <DesktopSalonCard key={s.id} salon={s} variant="marketplace" />
      ))}
    </div>
  );
}

/**
 * Banner → chapda xarita (2 qator baland) + o'ngda 4×3 kartochka grid.
 */
export function HomeBazaarLayout({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, mapSalons, loading, visibleCategoryKeys } = data;
  const { dealSalons, scrollToSalons, selectCategory } = useBazaarSections(data);

  const gridSalons = useMemo(() => filtered.slice(0, GRID_CARD_COUNT), [filtered]);

  return (
    <div className="flex w-full flex-col gap-10">
      <BazaarHeroBanner className="aspect-[4/1] max-h-[280px] w-full" />

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5 lg:grid-rows-3 lg:items-stretch">
        <div className="col-span-2 min-h-[280px] sm:col-span-1 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:min-h-0">
          <BazaarMapPanel
            salons={mapSalons}
            salonCount={filtered.length}
            className="h-full min-h-[280px] w-full lg:min-h-full"
          />
        </div>

        {gridSalons.map((salon, index) => (
          <div key={salon.id} className={`min-w-0 ${GRID_SLOTS[index] ?? ""}`}>
            <DesktopSalonCard salon={salon} variant="marketplace" />
          </div>
        ))}
      </div>

      <BazaarWeekendDeals salons={dealSalons} />
      <BazaarCategoryBrowse
        categories={visibleCategoryKeys}
        onSelect={selectCategory}
        onViewAll={scrollToSalons}
      />

      <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:gap-8">
        <aside className="xl:w-[280px] xl:shrink-0 xl:sticky xl:top-24">
          <BazaarFilterSidebar {...data} />
        </aside>
        <section id="nearby-salons" className="min-w-0 flex-1 scroll-mt-24">
          <BazaarPageTitle title={t("home.nearby")} count={filtered.length} />
          {loading ? <BazaarGridSkeleton /> : <SalonGrid salons={filtered} />}
        </section>
      </div>
    </div>
  );
}
