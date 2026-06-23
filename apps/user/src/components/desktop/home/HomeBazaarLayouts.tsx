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
type Salon = HomeData["filtered"][number];

const BAZAAR_ROW_CLASS =
  "grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,280px)_repeat(3,minmax(0,1fr))_minmax(320px,400px)] lg:items-start lg:gap-x-4";
const CENTER_COLS = ["lg:col-start-2", "lg:col-start-3", "lg:col-start-4"] as const;

type BazaarSalonRow = {
  left: Salon | null;
  center: Salon[];
  right: Salon | null;
};

/** 1-qator markazda 3 ta; keyingi qatorlarda chap | 3 markaz | o‘ng tartibida taqsimlanadi. */
function splitBazaarSalonRows(filtered: Salon[]): BazaarSalonRow[] {
  const rows: BazaarSalonRow[] = [];
  let rest = filtered.slice(3);

  while (rest.length > 0) {
    if (rest.length >= 5) {
      rows.push({ left: rest[0], center: rest.slice(1, 4), right: rest[4] });
      rest = rest.slice(5);
      continue;
    }

    rows.push({ left: rest[0] ?? null, center: rest.slice(1, 4), right: null });
    break;
  }

  return rows;
}

function SalonGridCells({ salons }: { salons: Salon[] }) {
  return (
    <>
      {salons.map((salon, index) => (
        <div key={salon.id} className={cn("min-w-0", CENTER_COLS[index])}>
          <DesktopSalonCard salon={salon} variant="marketplace" />
        </div>
      ))}
    </>
  );
}

function BazaarSalonRow({ row }: { row: BazaarSalonRow }) {
  return (
    <div className={BAZAAR_ROW_CLASS}>
      <div className="min-w-0 lg:col-start-1">
        {row.left ? <DesktopSalonCard salon={row.left} variant="marketplace" /> : null}
      </div>
      <SalonGridCells salons={row.center} />
      <div className="min-w-0 lg:col-start-5">
        {row.right ? <DesktopSalonCard salon={row.right} variant="marketplace" /> : null}
      </div>
    </div>
  );
}

export function HomeBazaarClassic({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, mapSalons, loading } = data;
  const topRowSalons = filtered.slice(0, 3);
  const salonRows = splitBazaarSalonRows(filtered);

  return (
    <div className="flex w-full flex-col gap-6">
      <BazaarPageTitle title={t("home.nearby")} count={filtered.length} />

      <BazaarHeroBanner className="aspect-[21/9] max-h-[400px]" />

      {/*
        Har bir qator — 5 ustunli grid: filter/map yoki kartochka | 3 markaz | kartochka.
        2-qator va keyingilari bir chiziqda: filter va map ostida ham kartochkalar.
      */}
      <div className="flex w-full flex-col gap-6">
        <div className={BAZAAR_ROW_CLASS}>
          <div className="lg:col-start-1">
            <BazaarFilterSidebar {...data} />
          </div>

          {loading ? (
            <div className="min-w-0 lg:col-span-3 lg:col-start-2">
              <BazaarGridSkeleton cols={3} />
            </div>
          ) : (
            <SalonGridCells salons={topRowSalons} />
          )}

          <div className="lg:col-start-5">
            <BazaarMapPanel salons={mapSalons} salonCount={filtered.length} />
          </div>
        </div>

        {!loading
          ? salonRows.map((row, index) => <BazaarSalonRow key={index} row={row} />)
          : null}
      </div>
    </div>
  );
}
