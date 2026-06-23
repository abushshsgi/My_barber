import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import {
  BazaarCategoryBrowse,
  BazaarFilterSidebar,
  BazaarGridSkeleton,
  BazaarHeroBanner,
  BazaarMapRail,
  BazaarPageTitle,
  BazaarWeekendDeals,
  SALON_GRID_CLASS,
} from "./bazaar/BazaarParts";

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

export function HomeBazaarClassic({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, mapSalons, loading, setCat, visibleCategoryKeys } = data;

  const dealSalons = useMemo(
    () => [...filtered].sort((a, b) => b.rating - a.rating).slice(0, 10),
    [filtered],
  );

  const scrollToSalons = () => {
    setCat("all");
    document.getElementById("nearby-salons")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex w-full flex-col gap-8 xl:flex-row xl:items-start xl:gap-8">
      <aside className="xl:w-[280px] xl:shrink-0 xl:sticky xl:top-24">
        <BazaarFilterSidebar {...data} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-10">
        <BazaarHeroBanner />

        <BazaarWeekendDeals salons={dealSalons} />

        <BazaarCategoryBrowse
          categories={visibleCategoryKeys}
          onSelect={(cat) => {
            setCat(cat);
            document.getElementById("nearby-salons")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onViewAll={scrollToSalons}
        />

        <BazaarMapRail salons={mapSalons} salonCount={filtered.length} />

        <section id="nearby-salons" className="min-w-0 scroll-mt-24">
          <BazaarPageTitle title={t("home.nearby")} count={filtered.length} />
          {loading ? <BazaarGridSkeleton /> : <SalonGrid salons={filtered} />}
        </section>
      </div>
    </div>
  );
}
