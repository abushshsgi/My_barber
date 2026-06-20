import { SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { cn } from "@/lib/utils";

export { BazaarMapPanel } from "./BazaarMapPanel";

type FilterProps = Pick<HomeData, "query" | "setQuery" | "effectiveCat" | "visibleCategoryKeys" | "setCat">;

export function BazaarFilterSidebar({ query, setQuery, effectiveCat, visibleCategoryKeys, setCat }: FilterProps) {
  const { t } = useTranslation();
  return (
    <aside className="sticky top-28">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
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
        <div className="mt-4 space-y-1">
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
    </aside>
  );
}

export function BazaarGridSkeleton({ cols }: { cols: number }) {
  return (
    <div className={cn("grid gap-5", cols === 2 && "grid-cols-2", cols === 3 && "grid-cols-3", cols === 4 && "grid-cols-4", cols === 5 && "grid-cols-5")}>
      {Array.from({ length: cols * 3 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[5/4] rounded-2xl bg-surface" />
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
