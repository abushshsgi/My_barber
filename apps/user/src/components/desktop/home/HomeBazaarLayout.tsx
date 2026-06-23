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

const GRID_CARD_COUNT = 9;

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
 * Banner → bir qator: chapda filter | o'rtada kartochkalar | o'ngda xarita (bir xil balandlik).
 */
export function HomeBazaarLayout({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, mapSalons, loading, visibleCategoryKeys } = data;
  const { dealSalons, scrollToSalons, selectCategory } = useBazaarSections(data);

  const gridSalons = useMemo(() => filtered.slice(0, GRID_CARD_COUNT), [filtered]);

  return (
    <div className="mx-auto w-full max-w-[1360px] px-3">
      <div className="flex w-full flex-col gap-10">
        <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 px-4 md:px-8">
          <BazaarHeroBanner className="mx-auto aspect-[21/9] max-h-[400px] w-full max-w-[1680px] rounded-3xl" />
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
          <aside className="h-[420px] w-full shrink-0 lg:w-[260px]">
            <BazaarFilterSidebar {...data} className="h-full" />
          </aside>

          <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:h-[420px] lg:grid-rows-3">
            {gridSalons.map((salon) => (
              <div key={salon.id} className="min-h-0 min-w-0 lg:h-full">
                <DesktopSalonCard salon={salon} variant="bazaar" />
              </div>
            ))}
          </div>

          <div className="h-[420px] w-full shrink-0 lg:w-[280px]">
            <BazaarMapPanel
              variant="preview"
              salons={mapSalons}
              salonCount={filtered.length}
              className="h-full w-full"
            />
          </div>
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
