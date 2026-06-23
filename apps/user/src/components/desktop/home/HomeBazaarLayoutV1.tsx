import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import {
  BazaarCategoryBrowse,
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

/** V1: katta banner → chap kartochkalar + o'ngda xarita kartochkasi */
export function HomeBazaarLayoutV1({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, mapSalons, loading, visibleCategoryKeys } = data;
  const { dealSalons, featuredSalons, scrollToSalons, selectCategory } = useBazaarSections(data);

  return (
    <div className="flex flex-col gap-10">
      <BazaarHeroBanner className="max-h-[300px] aspect-[5/2] xl:aspect-[3/1]" />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="flex shrink-0 flex-col gap-4 lg:w-[260px]">
          {featuredSalons.map((salon) => (
            <DesktopSalonCard key={salon.id} salon={salon} variant="marketplace" />
          ))}
        </div>
        <div className="min-w-0 flex-1 lg:flex lg:justify-center xl:justify-end">
          <BazaarMapCard
            salons={mapSalons}
            salonCount={filtered.length}
            className="mx-auto w-full max-w-[440px] lg:mx-0"
          />
        </div>
      </div>

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
  );
}
