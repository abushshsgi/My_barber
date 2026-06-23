import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import {
  BazaarCategoryBrowse,
  BazaarFilterSidebar,
  BazaarGridSkeleton,
  BazaarHeroBanner,
  BazaarPageTitle,
  BazaarWeekendDeals,
  SALON_GRID_CLASS,
} from "./bazaar/BazaarParts";
import { BazaarMapCard } from "./bazaar/BazaarMapCard";
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

/** V3: hero + xarita bir qatorda (split) · filter pastda grid yonida */
export function HomeBazaarLayoutV3({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, mapSalons, loading, visibleCategoryKeys } = data;
  const { dealSalons, scrollToSalons, selectCategory } = useBazaarSections(data);

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)] xl:items-stretch">
        <BazaarHeroBanner className="min-h-[220px] max-h-[320px] aspect-[5/3] xl:aspect-auto xl:h-full xl:max-h-none" />
        <BazaarMapCard salons={mapSalons} salonCount={filtered.length} className="max-w-none" />
      </div>

      <BazaarCategoryBrowse
        categories={visibleCategoryKeys}
        onSelect={selectCategory}
        onViewAll={scrollToSalons}
      />
      <BazaarWeekendDeals salons={dealSalons} />

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
