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

const GRID_SLOTS = [
  "lg:col-start-2 lg:row-start-1",
  "lg:col-start-3 lg:row-start-1",
  "lg:col-start-4 lg:row-start-1",
  "lg:col-start-2 lg:row-start-2",
  "lg:col-start-3 lg:row-start-2",
  "lg:col-start-4 lg:row-start-2",
  "lg:col-start-2 lg:row-start-3",
  "lg:col-start-3 lg:row-start-3",
  "lg:col-start-4 lg:row-start-3",
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
 * Banner → chapda filter (2 qator) + o'ngda kartochkalar + yuqori o'ngda xarita.
 */
export function HomeBazaarLayout({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, mapSalons, loading, visibleCategoryKeys } = data;
  const { dealSalons, scrollToSalons, selectCategory } = useBazaarSections(data);

  const gridSalons = useMemo(() => filtered.slice(0, GRID_CARD_COUNT), [filtered]);

  return (
    <div className="mx-auto w-full max-w-[1360px] px-3">
      <div className="flex w-full flex-col gap-10">
        <BazaarHeroBanner className="mx-auto aspect-[2.85/1] max-h-[360px] w-full rounded-3xl" />

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6 lg:grid-rows-3 lg:items-stretch">
          <div className="col-span-2 min-h-[300px] sm:col-span-1 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:min-h-0">
            <BazaarFilterSidebar {...data} className="h-full min-h-[300px] lg:min-h-full" />
          </div>

          {gridSalons.map((salon, index) => (
            <div key={salon.id} className={`min-w-0 ${GRID_SLOTS[index] ?? ""}`}>
              <DesktopSalonCard salon={salon} variant="marketplace" />
            </div>
          ))}

          <div className="min-w-0 lg:col-span-2 lg:col-start-5 lg:row-start-1">
            <BazaarMapPanel
              variant="preview"
              salons={mapSalons}
              salonCount={filtered.length}
              className="h-[420px] w-full"
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
