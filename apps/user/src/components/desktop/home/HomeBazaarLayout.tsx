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

const GRID_CARD_COUNT = 6;

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
 * Wireframe: hero banner → filtr | kartochkalar | map (bir qator, bir xil balandlik).
 */
export function HomeBazaarLayout({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, mapSalons, loading, visibleCategoryKeys } = data;
  const { dealSalons, scrollToSalons, selectCategory } = useBazaarSections(data);

  const gridSalons = useMemo(() => filtered.slice(0, GRID_CARD_COUNT), [filtered]);

  return (
    <div className="w-full">
      <div className="flex w-full flex-col gap-8">
        <BazaarHeroBanner className="aspect-[21/9] max-h-[400px]" />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)_400px] lg:items-start">
          <aside className="h-[450px]">
            <BazaarFilterSidebar {...data} className="h-full" />
          </aside>

          <section className="min-w-0 overflow-x-auto lg:h-[450px]">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:h-full lg:w-max lg:grid-cols-[repeat(3,300px)] lg:grid-rows-2">
              {gridSalons.map((salon) => (
                <div key={salon.id} className="min-h-0 min-w-0">
                  <DesktopSalonCard salon={salon} variant="bazaar" />
                </div>
              ))}
            </div>
          </section>

          <aside className="h-[320px]">
            <BazaarMapPanel
              variant="preview"
              salons={mapSalons}
              salonCount={filtered.length}
              className="h-full w-full"
            />
          </aside>
        </div>

        <BazaarWeekendDeals salons={dealSalons} />
        <BazaarCategoryBrowse
          categories={visibleCategoryKeys}
          onSelect={selectCategory}
          onViewAll={scrollToSalons}
        />

        <section id="nearby-salons" className="min-w-0 scroll-mt-24">
          <BazaarPageTitle title={t("home.nearby")} count={filtered.length} />
          {loading ? <BazaarGridSkeleton /> : <SalonGrid salons={filtered} />}
        </section>
      </div>
    </div>
  );
}
