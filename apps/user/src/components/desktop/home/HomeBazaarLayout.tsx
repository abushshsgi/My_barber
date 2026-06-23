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

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr_480px] lg:items-start">
          <aside>
            <BazaarFilterSidebar {...data} className="min-h-[280px]" />
          </aside>

          <section className="min-w-0">
            <div className="grid w-full grid-cols-2 gap-5 xl:grid-cols-3">
              {gridSalons.map((salon) => (
                <DesktopSalonCard key={salon.id} salon={salon} variant="bazaar" />
              ))}
            </div>
          </section>

          <aside className="h-[220px]">
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
