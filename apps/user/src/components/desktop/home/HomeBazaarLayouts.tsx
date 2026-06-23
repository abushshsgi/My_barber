import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import {
  BazaarFilterSidebar,
  BazaarGridSkeleton,
  BazaarHeroBanner,
  BazaarMapPanel,
  BazaarPageTitle,
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
  const { filtered, mapSalons, loading } = data;

  return (
    <div className="w-full">
      <BazaarPageTitle title={t("home.nearby")} count={filtered.length} />
      <div className="flex w-full flex-col gap-6">
        {/* 1-qator: filter | banner | xarita — bir xil balandlik (xarita aspect bo'yicha) */}
        <div className="flex flex-col gap-6 xl:flex-row xl:items-stretch xl:gap-8">
          <div className="min-h-0 xl:w-[280px] xl:shrink-0">
            <BazaarFilterSidebar {...data} />
          </div>

          <div className="min-h-0 min-w-0 flex-1">
            <BazaarHeroBanner />
          </div>

          <div className="relative min-h-0 w-full shrink-0 xl:w-[400px]">
            <div className="aspect-[5/4] w-full" aria-hidden />
            <BazaarMapPanel
              salons={mapSalons}
              salonCount={filtered.length}
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>

        <section className="min-w-0">
          {loading ? <BazaarGridSkeleton /> : <SalonGrid salons={filtered} />}
        </section>
      </div>
    </div>
  );
}
