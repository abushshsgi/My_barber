import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import {
  BazaarFilterSidebar,
  BazaarGridSkeleton,
  BazaarHeroBanner,
  BazaarMapPanel,
  BazaarPageTitle,
} from "./bazaar/BazaarParts";

type Props = { data: HomeData };

function SalonGrid({ salons }: { salons: HomeData["filtered"] }) {
  return (
    <div className="grid grid-cols-2 gap-5 2xl:grid-cols-3 2xl:gap-6">
      {salons.map((s) => (
        <DesktopSalonCard key={s.id} salon={s} variant="marketplace" />
      ))}
    </div>
  );
}

export function HomeBazaarClassic({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, mapSalons, loading } = data;
  const topSalon = filtered[0];
  const sideSalonLeft = filtered.length > 1 ? filtered[1] : undefined;
  const sideSalonRight = filtered.length > 2 ? filtered[2] : undefined;
  const gridSalons = filtered.length > 3 ? filtered.slice(3) : [];

  return (
    <div className="flex w-full flex-col gap-6">
      <BazaarPageTitle title={t("home.nearby")} count={filtered.length} />

      <BazaarHeroBanner className="aspect-[21/9] max-h-[400px]" />

      {/*
        1-qator: filter (chap) + top kartochka (o'rta) + xarita (o'ng).
        2-qator: chap kartochka | markaz grid | o'ng kartochka.
      */}
      <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(240px,280px)_minmax(0,1fr)_minmax(320px,400px)] xl:grid-rows-[auto_auto] xl:items-start xl:gap-x-8 xl:gap-y-6">
        <div className="xl:col-start-1 xl:row-start-1">
          <BazaarFilterSidebar {...data} />
        </div>

        {topSalon ? (
          <div className="min-w-0 xl:col-start-2 xl:row-start-1">
            <DesktopSalonCard salon={topSalon} variant="marketplace" />
          </div>
        ) : null}

        <div className="xl:col-start-3 xl:row-start-1">
          <BazaarMapPanel salons={mapSalons} salonCount={filtered.length} />
        </div>

        {sideSalonLeft ? (
          <div className="xl:col-start-1 xl:row-start-2">
            <DesktopSalonCard salon={sideSalonLeft} variant="marketplace" />
          </div>
        ) : null}

        <section className="min-w-0 xl:col-start-2 xl:row-start-2">
          {loading ? <BazaarGridSkeleton cols={3} /> : <SalonGrid salons={gridSalons} />}
        </section>

        {sideSalonRight ? (
          <div className="xl:col-start-3 xl:row-start-2">
            <DesktopSalonCard salon={sideSalonRight} variant="marketplace" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
