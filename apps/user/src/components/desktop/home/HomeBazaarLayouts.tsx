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
  const topRowSalons = filtered.slice(0, 3);
  const sideSalonLeft = filtered.length > 3 ? filtered[3] : undefined;
  const sideSalonRight = filtered.length > 4 ? filtered[4] : undefined;
  const gridSalons = filtered.length > 5 ? filtered.slice(5) : [];

  return (
    <div className="flex w-full flex-col gap-6">
      <BazaarPageTitle title={t("home.nearby")} count={filtered.length} />

      <BazaarHeroBanner className="aspect-[21/9] max-h-[400px]" />

      {/*
        1-qator: filter (chap) + 3 ta kartochka (o'rta) + xarita (o'ng).
        2-qator: chap kartochka | markaz grid | o'ng kartochka.
      */}
      <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(240px,280px)_minmax(0,1fr)_minmax(320px,400px)] xl:grid-rows-[auto_auto] xl:items-start xl:gap-x-8 xl:gap-y-6">
        <div className="xl:col-start-1 xl:row-start-1">
          <BazaarFilterSidebar {...data} />
        </div>

        {topRowSalons.length > 0 ? (
          <div className="min-w-0 xl:col-start-2 xl:row-start-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {topRowSalons.map((salon) => (
                <DesktopSalonCard key={salon.id} salon={salon} variant="marketplace" />
              ))}
            </div>
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
