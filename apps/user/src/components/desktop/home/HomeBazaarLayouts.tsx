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
  "grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,280px)_repeat(3,minmax(0,1fr))_minmax(320px,400px)] lg:items-start lg:gap-x-4 lg:[--bazaar-card-w:calc((100%-280px-400px-4*1rem)/3)]";
const CENTER_COLS = ["lg:col-start-2", "lg:col-start-3", "lg:col-start-4"] as const;

type BazaarSalonRow = {
  left: Salon | null;
  center: Salon[];
  right: Salon | null;
};

function BazaarSideCard({ salon, side }: { salon: Salon; side: "left" | "right" }) {
  return (
    <div
      className={cn(
        "w-full min-w-0",
        side === "left" && "lg:flex lg:justify-end",
        side === "right" && "lg:flex lg:justify-start",
      )}
    >
      {/*
        shrink-0: flex + min-w-0 on parent otherwise collapses card width to 0
        and only the text block below the image stays visible.
      */}
      <div className="w-full shrink-0 lg:w-[var(--bazaar-card-w)]">
        <DesktopSalonCard salon={salon} variant="marketplace" />
      </div>
    </div>
  );
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

/** Har qator: chap 1 ta | markaz 3 ta | o‘ng 1 ta kartochka. */
function splitBazaarSalonRows(filtered: Salon[]): BazaarSalonRow[] {
  const rows: BazaarSalonRow[] = [];
  let rest = filtered.slice(3);

  while (rest.length > 0) {
    if (rest.length >= 5) {
      rows.push({ left: rest[0]!, center: rest.slice(1, 4), right: rest[4]! });
      rest = rest.slice(5);
      continue;
    }

    rows.push({ left: rest[0] ?? null, center: rest.slice(1), right: null });
    break;
  }

  return rows;
}

function BazaarSalonRow({ row }: { row: BazaarSalonRow }) {
  return (
    <div className={BAZAAR_ROW_CLASS}>
      <div className="min-w-0 lg:col-start-1">
        {row.left ? <BazaarSideCard salon={row.left} side="left" /> : null}
      </div>
      <SalonGridCells salons={row.center} />
      <div className="min-w-0 lg:col-start-5">
        {row.right ? <BazaarSideCard salon={row.right} side="right" /> : null}
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
    <div className="flex w-full flex-col gap-6 px-[150px]">
      <BazaarHeroBanner />

      <div className="flex w-full flex-col gap-4">
        <div className={BAZAAR_ROW_CLASS}>
          <div className="hidden lg:block lg:col-start-1" aria-hidden />
          <div className="lg:col-span-3 lg:col-start-2">
            <BazaarPageTitle title={t("home.nearby")} count={filtered.length} className="mb-0" />
          </div>
          <div className="hidden lg:block lg:col-start-5" aria-hidden />
        </div>

        <div className={BAZAAR_ROW_CLASS}>
          <div className="self-start lg:sticky lg:top-[5.75rem] lg:col-start-1">
            <BazaarFilterSidebar {...data} />
          </div>

          {loading ? (
            <div className="min-w-0 lg:col-span-3 lg:col-start-2">
              <BazaarGridSkeleton cols={3} />
            </div>
          ) : (
            <SalonGridCells salons={topRowSalons} />
          )}

          <div className="self-start lg:col-start-5">
            <BazaarMapPanel salons={mapSalons} />
          </div>
        </div>

        {!loading ? salonRows.map((row, index) => <BazaarSalonRow key={index} row={row} />) : null}
      </div>
    </div>
  );
}
