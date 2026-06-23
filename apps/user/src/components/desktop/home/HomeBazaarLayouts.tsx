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
const BAZAAR_CARD_W =
  "xl:w-[var(--bazaar-card-w)] xl:max-w-full xl:min-w-0";

function SalonCardSlot({ salon, className }: { salon: HomeData["filtered"][number]; className?: string }) {
  return (
    <div className={cn(BAZAAR_CARD_W, className)}>
      <DesktopSalonCard salon={salon} variant="marketplace" />
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
  const row2SideLeft = filtered[3];
  const row2SideRight = filtered[4];
  const row2MiddleFirst = filtered.slice(5, 8);
  const row2Rest = filtered.slice(8);
  const hasRow2Primary = Boolean(row2SideLeft || row2SideRight || row2MiddleFirst.length > 0);
  const hasRow2 = hasRow2Primary || row2Rest.length > 0;

  return (
    <div className="flex w-full flex-col gap-6">
      <BazaarPageTitle title={t("home.nearby")} count={filtered.length} />

      <BazaarHeroBanner className="aspect-[21/9] max-h-[400px]" />

      {/*
        5 ustun: filter | 3 ta kartochka | map.
        2-qator: filter/map ostida kartochka + o'rta 3 ustun — bir xil kenglik.
      */}
      <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(240px,280px)_repeat(3,minmax(0,1fr))_minmax(320px,400px)] xl:grid-rows-[auto_auto_auto] xl:items-start xl:gap-x-4 xl:gap-y-6 xl:[--bazaar-card-w:calc((100%-280px-400px-4*1rem)/3)]">
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

        {hasRow2 ? (
          <>
            {row2SideLeft ? (
              <div className="flex min-w-0 justify-end xl:col-start-1 xl:row-start-2">
                <SalonCardSlot salon={row2SideLeft} />
              </div>
            ) : null}

            {row2MiddleFirst.map((salon, index) => (
              <div
                key={salon.id}
                className={cn("min-w-0 xl:row-start-2", TOP_CARD_COLS[index])}
              >
                <DesktopSalonCard salon={salon} variant="marketplace" />
              </div>
            ))}

            {row2SideRight ? (
              <div className="flex min-w-0 justify-start xl:col-start-5 xl:row-start-2">
                <SalonCardSlot salon={row2SideRight} />
              </div>
            ) : null}

            {row2Rest.length > 0 ? (
              <section
                className={cn(
                  "min-w-0 xl:col-span-3 xl:col-start-2",
                  hasRow2Primary ? "xl:row-start-3" : "xl:row-start-2",
                )}
              >
                {loading ? (
                  <BazaarGridSkeleton cols={3} />
                ) : (
                  <SalonCards salons={row2Rest} />
                )}
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
