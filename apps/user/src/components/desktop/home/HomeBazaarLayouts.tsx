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
const BAZAAR_GRID_CLASS =
  "grid w-full grid-cols-1 gap-6 lg:grid-cols-[minmax(240px,280px)_repeat(3,minmax(0,1fr))_minmax(320px,400px)] lg:grid-rows-[auto_auto_auto] lg:items-start lg:gap-x-4 lg:gap-y-6 lg:[--bazaar-card-w:calc((100%-280px-400px-4*1rem)/3)]";
const TOP_CARD_COLS = ["lg:col-start-2", "lg:col-start-3", "lg:col-start-4"] as const;
const ROW2_COLS = ["lg:col-start-1", "lg:col-start-2", "lg:col-start-3", "lg:col-start-4", "lg:col-start-5"] as const;
const SIDE_CARD_W = "lg:w-[var(--bazaar-card-w)] lg:max-w-full lg:min-w-0";

function Row2CardSlot({ salon, index }: { salon: HomeData["filtered"][number]; index: number }) {
  const isSide = index === 0 || index === 4;

  return (
    <div
      className={cn(
        "min-w-0 lg:row-start-2",
        ROW2_COLS[index],
        index === 0 && "lg:flex lg:justify-end",
        index === 4 && "lg:flex lg:justify-start",
      )}
    >
      <div className={cn(isSide ? SIDE_CARD_W : "w-full")}>
        <DesktopSalonCard salon={salon} variant="marketplace" />
      </div>
    </div>
  );
}

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
  const row2Line = filtered.slice(3, 8);
  const row2Rest = filtered.slice(8);

  return (
    <div className="flex w-full flex-col gap-6">
      <BazaarPageTitle title={t("home.nearby")} count={filtered.length} />

      <BazaarHeroBanner className="aspect-[21/9] max-h-[400px]" />

      {/*
        5 ustun: filter | 3 kartochka | map.
        2-qator: har ustunda bitta kartochka (filter va map ostida ham).
      */}
      <div className={BAZAAR_GRID_CLASS}>
        <div className="lg:col-start-1 lg:row-start-1">
          <BazaarFilterSidebar {...data} />
        </div>

        {topRowSalons.map((salon, index) => (
          <div
            key={salon.id}
            className={cn("min-w-0 lg:row-start-1", TOP_CARD_COLS[index])}
          >
            <DesktopSalonCard salon={salon} variant="marketplace" />
          </div>
        ))}

        <div className="lg:col-start-5 lg:row-start-1">
          <BazaarMapPanel salons={mapSalons} salonCount={filtered.length} />
        </div>

        {row2Line.map((salon, index) => (
          <Row2CardSlot key={salon.id} salon={salon} index={index} />
        ))}

        {row2Rest.length > 0 ? (
          <section
            className={cn(
              "min-w-0 lg:col-span-3 lg:col-start-2",
              row2Line.length > 0 ? "lg:row-start-3" : "lg:row-start-2",
            )}
          >
            {loading ? <BazaarGridSkeleton cols={3} /> : <SalonCards salons={row2Rest} />}
          </section>
        ) : null}
      </div>
    </div>
  );
}
