import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { BAZAAR_GREEN } from "@/lib/desktop-variant";
import {
  BazaarFilterSidebar,
  BazaarGridSkeleton,
  BazaarMapPanel,
  BazaarMapStrip,
  BazaarPageTitle,
  BazaarTopFilters,
} from "./bazaar/BazaarParts";

type Props = { data: HomeData };

function SalonGrid({ salons, cols }: { salons: HomeData["filtered"]; cols: 2 | 3 | 4 | 5 }) {
  const gridClass =
    cols === 2 ? "grid-cols-2 gap-6" :
    cols === 3 ? "grid-cols-3 gap-5" :
    cols === 4 ? "grid-cols-4 gap-5" :
    "grid-cols-5 gap-4";

  return (
    <div className={`grid ${gridClass}`}>
      {salons.map((s) => (
        <DesktopSalonCard key={s.id} salon={s} variant={cols <= 3 ? "marketplace" : "grid"} />
      ))}
    </div>
  );
}

/** Classic — filter | 3-col | map (yaxshilangan bazaar) */
export function HomeBazaarClassic({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, loading } = data;

  return (
    <div>
      <BazaarPageTitle title={t("home.nearby")} count={filtered.length} />
      <div className="grid grid-cols-[260px_1fr_300px] gap-8">
        <BazaarFilterSidebar {...data} />
        <section>
          {loading ? <BazaarGridSkeleton cols={3} /> : <SalonGrid salons={filtered} cols={3} />}
        </section>
        <BazaarMapPanel tall />
      </div>
    </div>
  );
}

/** Spread — yuqori filter, 4 ustun to'liq */
export function HomeBazaarSpread({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, loading, query, setQuery } = data;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("common.search")}
          className="flex-1 rounded-2xl border border-border px-5 py-3 text-sm shadow-sm focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
        />
        <Link
          to="/map"
          className="shrink-0 rounded-2xl px-6 py-3 text-sm font-bold text-white"
          style={{ backgroundColor: BAZAAR_GREEN }}
        >
          {t("common.viewMap")}
        </Link>
      </div>
      <BazaarTopFilters {...data} count={filtered.length} />
      <section className="mt-6">
        {loading ? <BazaarGridSkeleton cols={4} /> : <SalonGrid salons={filtered} cols={4} />}
      </section>
      <Link
        to="/today"
        className="mt-8 flex items-center justify-between rounded-2xl border border-border bg-surface/50 px-6 py-4 transition-colors hover:bg-surface"
      >
        <span className="font-bold">{t("homePage.quick.today")}</span>
        <ChevronRight className="h-5 w-5" />
      </Link>
    </div>
  );
}

/** Horizon — xarita strip + grid */
export function HomeBazaarHorizon({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, loading } = data;

  return (
    <div>
      <BazaarMapStrip />
      <BazaarTopFilters {...data} count={filtered.length} />
      <div className="mt-6 grid grid-cols-[220px_1fr] gap-8">
        <BazaarFilterSidebar {...data} compact />
        <section>
          {loading ? <BazaarGridSkeleton cols={3} /> : <SalonGrid salons={filtered} cols={3} />}
        </section>
      </div>
    </div>
  );
}

/** Atlas — xarita chap, ro'yxat o'ng */
export function HomeBazaarAtlas({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, loading } = data;

  return (
    <div>
      <BazaarPageTitle title={t("home.nearby")} count={filtered.length} />
      <div className="grid grid-cols-[minmax(360px,42%)_1fr] gap-8">
        <div className="sticky top-28 space-y-4">
          <BazaarMapPanel tall className="!static" />
          <BazaarFilterSidebar {...data} compact />
        </div>
        <section>
          <BazaarTopFilters {...data} count={filtered.length} />
          <div className="mt-6">
            {loading ? <BazaarGridSkeleton cols={2} /> : <SalonGrid salons={filtered} cols={2} />}
          </div>
        </section>
      </div>
    </div>
  );
}

/** Luxe — featured + 2 ustun katta kartalar */
export function HomeBazaarLuxe({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, featuredSalons, loading, personalized } = data;
  const featured = featuredSalons.length > 0 ? featuredSalons : filtered.slice(0, 4);

  return (
    <div>
      <section className="mb-10">
        <h2 className="text-lg font-bold">{t(personalized ? "homePage.nearYou" : "homePage.pickedForYou")}</h2>
        <div className="no-scrollbar mt-4 flex gap-5 overflow-x-auto pb-2">
          {featured.map((s) => (
            <div key={s.id} className="w-[300px] shrink-0">
              <DesktopSalonCard salon={s} variant="editorial" />
            </div>
          ))}
        </div>
      </section>
      <div className="grid grid-cols-[240px_1fr] gap-8">
        <BazaarFilterSidebar {...data} />
        <section>
          <BazaarTopFilters {...data} count={filtered.length} />
          <div className="mt-6">
            {loading ? <BazaarGridSkeleton cols={2} /> : <SalonGrid salons={filtered} cols={2} />}
          </div>
        </section>
      </div>
    </div>
  );
}
