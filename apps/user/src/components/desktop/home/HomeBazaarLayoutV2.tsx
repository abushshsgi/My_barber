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

function SalonGrid({ salons }: { salons: HomeData["filtered"] }) {
  return (
    <div className={SALON_GRID_CLASS}>
      {salons.map((s) => (
        <DesktopSalonCard key={s.id} salon={s} variant="marketplace" />
      ))}
    </div>
  );
}

/** V2: sticky filter · xarita yuqorida keng · keyin discovery */
export function HomeBazaarLayoutV2({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, mapSalons, loading, visibleCategoryKeys } = data;
  const { dealSalons, scrollToSalons, selectCategory } = useBazaarSections(data);

  return (
    <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:gap-8">
      <aside className="xl:w-[280px] xl:shrink-0 xl:sticky xl:top-24">
        <BazaarFilterSidebar {...data} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-10">
        <div className="relative aspect-[21/9] w-full max-h-[320px] overflow-hidden rounded-2xl">
          <BazaarMapPanel
            salons={mapSalons}
            salonCount={filtered.length}
            className="absolute inset-0 h-full w-full"
          />
        </div>

        <BazaarHeroBanner className="max-h-[200px] aspect-[4/1]" />

        <BazaarWeekendDeals salons={dealSalons} />
        <BazaarCategoryBrowse
          categories={visibleCategoryKeys}
          onSelect={selectCategory}
          onViewAll={scrollToSalons}
        />

        <section id="nearby-salons" className="scroll-mt-24">
          <BazaarPageTitle title={t("home.nearby")} count={filtered.length} />
          {loading ? <BazaarGridSkeleton /> : <SalonGrid salons={filtered} />}
        </section>
      </div>
    </div>
  );
}
