import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { cn } from "@/lib/utils";
import {
  BazaarFilterSidebar,
  BazaarGridSkeleton,
  BazaarHeroBanner,
  BazaarMapPanel,
  BazaarPageTitle,
} from "./bazaar/BazaarParts";

type Props = { data: HomeData };

const CARD_GRID_CLASS = "grid grid-cols-1 gap-4 sm:grid-cols-3";
const TOP_CARD_COLS = ["xl:col-start-2", "xl:col-start-3", "xl:col-start-4"] as const;

function SalonCards({ salons }: { salons: HomeData["filtered"] }) {
  return (
    <div className={CARD_GRID_CLASS}>
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
  const row2Salons = filtered.slice(3);

  return (
    <div className="flex w-full flex-col gap-6">
      <BazaarPageTitle title={t("home.nearby")} count={filtered.length} />

      <BazaarHeroBanner className="aspect-[21/9] max-h-[400px]" />

      {/*
        5 ustun: filter | 3 ta kartochka ustuni | map.
        2-qator kartochkalari o'rta 3 ustunda — yuqoridagi kartochkalar bilan bir xil o'lcham.
      */}
      <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(240px,280px)_repeat(3,minmax(0,1fr))_minmax(320px,400px)] xl:grid-rows-[auto_auto] xl:items-start xl:gap-x-4 xl:gap-y-6">
        <div className="xl:col-start-1 xl:row-start-1">
          <BazaarFilterSidebar {...data} />
        </div>

        {topRowSalons.map((salon, index) => (
          <div
            key={salon.id}
            className={cn("min-w-0 xl:row-start-1", TOP_CARD_COLS[index])}
          >
            <DesktopSalonCard salon={salon} variant="marketplace" />
          </div>
        ))}

        <div className="xl:col-start-5 xl:row-start-1">
          <BazaarMapPanel salons={mapSalons} salonCount={filtered.length} />
        </div>

        {row2Salons.length > 0 ? (
          <section className="min-w-0 xl:col-span-3 xl:col-start-2 xl:row-start-2">
            {loading ? <BazaarGridSkeleton cols={3} /> : <SalonCards salons={row2Salons} />}
          </section>
        ) : null}
      </div>
    </div>
  );
}
