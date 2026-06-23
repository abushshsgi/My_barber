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

const BAZAAR_LAYOUT_CLASS =
  "grid w-full grid-cols-1 gap-6 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)_minmax(320px,400px)] lg:items-start lg:gap-x-4 lg:[--bazaar-card-w:calc((100%-280px-400px-2*1rem)/3)]";
const CENTER_ROW_CLASS = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
const SIDE_CARD_W = "w-full lg:w-[var(--bazaar-card-w)] lg:max-w-full lg:min-w-0";

function BazaarSideCard({ salon, align }: { salon: Salon; align: "left" | "right" }) {
  return (
    <div
      className={cn(
        "min-w-0",
        align === "left" && "lg:flex lg:justify-end",
        align === "right" && "lg:flex lg:justify-start",
      )}
    >
      <div className={SIDE_CARD_W}>
        <DesktopSalonCard salon={salon} variant="marketplace" />
      </div>
    </div>
  );
}

function CenterSalonRow({ salons }: { salons: Salon[] }) {
  if (salons.length === 0) return null;

  return (
    <div className={CENTER_ROW_CLASS}>
      {salons.map((salon) => (
        <div key={salon.id} className="min-w-0">
          <DesktopSalonCard salon={salon} variant="marketplace" />
        </div>
      ))}
    </div>
  );
}

/** 1-qator markazda 3 ta; keyin chap ustun | 3 markaz | o‘ng ustun tartibida taqsimlanadi. */
function splitBazaarSalons(filtered: Salon[]) {
  const topRow = filtered.slice(0, 3);
  const leftStack: Salon[] = [];
  const rightStack: Salon[] = [];
  const centerRows: Salon[][] = [];

  let rest = filtered.slice(3);
  while (rest.length > 0) {
    if (rest.length >= 5) {
      leftStack.push(rest[0]!);
      centerRows.push(rest.slice(1, 4));
      rightStack.push(rest[4]!);
      rest = rest.slice(5);
      continue;
    }

    leftStack.push(rest[0]!);
    const center = rest.slice(1);
    if (center.length) centerRows.push(center);
    break;
  }

  return { topRow, leftStack, rightStack, centerRows };
}

export function HomeBazaarClassic({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, mapSalons, loading } = data;
  const { topRow, leftStack, rightStack, centerRows } = splitBazaarSalons(filtered);

  return (
    <div className="flex w-full flex-col gap-6">
      <BazaarHeroBanner />

      {/*
        3 ustun: filter + kartochkalar | markaz grid | map + kartochkalar.
        "Салоны рядом" markaz ustunda, filter/map ostida salon kartochkalari.
      */}
      <div className={BAZAAR_LAYOUT_CLASS}>
        <aside className="flex flex-col gap-4">
          <BazaarFilterSidebar {...data} />
          {!loading
            ? leftStack.map((salon) => <BazaarSideCard key={salon.id} salon={salon} align="left" />)
            : null}
        </aside>

        <section className="flex min-w-0 flex-col gap-4">
          <BazaarPageTitle title={t("home.nearby")} count={filtered.length} className="mb-0" />
          {loading ? (
            <BazaarGridSkeleton cols={3} />
          ) : (
            <>
              <CenterSalonRow salons={topRow} />
              {centerRows.map((row, index) => (
                <CenterSalonRow key={index} salons={row} />
              ))}
            </>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <BazaarMapPanel salons={mapSalons} />
          {!loading
            ? rightStack.map((salon) => <BazaarSideCard key={salon.id} salon={salon} align="right" />)
            : null}
        </aside>
      </div>
    </div>
  );
}
