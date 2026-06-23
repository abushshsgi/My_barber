import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import {
  BazaarFilterSidebar,
  BazaarGridSkeleton,
  BazaarMapPanel,
  BazaarPageTitle,
  BazaarTrendAiPanel,
} from "./bazaar/BazaarParts";

type Props = { data: HomeData };

function SalonGrid({ salons }: { salons: HomeData["filtered"] }) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] 2xl:gap-6">
      {salons.map((s) => (
        <DesktopSalonCard key={s.id} salon={s} variant="marketplace" />
      ))}
    </div>
  );
}

export function HomeBazaarClassic({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, mapSalons, loading, trending } = data;

  return (
    <div className="w-full">
      <BazaarPageTitle title={t("home.nearby")} count={filtered.length} />
      {/*
        1-qator: filter (chap) + trend/AI (o'rta) + xarita (o'ng).
        2-qator: barcha salon kartochkalari bir gridda — bir xil o'lcham.
      */}
      <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(240px,280px)_minmax(0,1fr)_minmax(320px,400px)] xl:grid-rows-[auto_auto] xl:items-stretch xl:gap-x-8 xl:gap-y-6">
        <div className="xl:col-start-1 xl:row-start-1">
          <BazaarFilterSidebar {...data} />
        </div>

        <div className="min-w-0 xl:col-start-2 xl:row-start-1">
          <BazaarTrendAiPanel trending={trending} />
        </div>

        <div className="xl:col-start-3 xl:row-start-1">
          <BazaarMapPanel salons={mapSalons} salonCount={filtered.length} />
        </div>

        <section className="min-w-0 xl:col-span-3 xl:row-start-2">
          {loading ? <BazaarGridSkeleton /> : <SalonGrid salons={filtered} />}
        </section>
      </div>
    </div>
  );
}
