import { SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { cn } from "@/lib/utils";

export { BazaarMapPanel } from "./BazaarMapPanel";
export { BazaarHeroBanner } from "./BazaarHeroBanner";
export {
  BazaarWeekendDeals,
  BazaarCategoryBrowse,
  BazaarMapRail,
} from "./BazaarDiscoveryRails";

type FilterProps = Pick<HomeData, "query" | "setQuery" | "effectiveCat" | "visibleCategoryKeys" | "setCat"> & {
  className?: string;
};

export function BazaarFilterSidebar({
  query,
  setQuery,
  effectiveCat,
  visibleCategoryKeys,
  setCat,
  className,
}: FilterProps) {
  const { t } = useTranslation();
  return (
    <div className={cn("flex h-full flex-col rounded-2xl border border-border bg-card p-4 shadow-sm", className)}>
      <p className="flex items-center gap-2 text-sm font-bold">
        <SlidersHorizontal className="h-4 w-4 text-foreground" />
        {t("common.search", { defaultValue: "Filter" })}
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("common.search")}
        className="mt-3 w-full rounded-xl border border-border bg-surface/50 px-3 py-2.5 text-sm focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
      />
      <div className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto">
        {visibleCategoryKeys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setCat(key)}
            className={cn(
              "flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
              effectiveCat === key
                ? "bg-foreground text-background shadow-sm"
                : "text-foreground hover:bg-surface",
            )}
          >
            {t(`home.categories.${key}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

export const SALON_GRID_CLASS =
  "grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] 2xl:grid-cols-5 2xl:gap-6";

export function BazaarGridSkeleton() {
  return (
    <div className={SALON_GRID_CLASS}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[5/4] rounded-xl bg-surface" />
          <div className="mt-3 h-4 w-2/3 rounded bg-surface" />
        </div>
      ))}
    </div>
  );
}

export function BazaarPageTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-6 flex items-baseline gap-3">
      <h1 className="text-2xl font-bold tracking-tight xl:text-3xl">{title}</h1>
      <span className="rounded-full bg-foreground px-3 py-1 text-sm font-bold text-background">
        {count}
      </span>
    </div>
  );
}
