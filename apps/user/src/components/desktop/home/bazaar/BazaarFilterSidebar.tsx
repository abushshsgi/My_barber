import { Link } from "@tanstack/react-router";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { cn } from "@/lib/utils";

type FilterProps = Pick<HomeData, "query" | "setQuery" | "effectiveCat" | "visibleCategoryKeys" | "setCat">;

export function BazaarFilterSidebar({
  query,
  setQuery,
  effectiveCat,
  visibleCategoryKeys,
  setCat,
}: FilterProps) {
  const { t } = useTranslation();

  const mapSearch = {
    ...(query.trim() ? { q: query.trim() } : {}),
    ...(effectiveCat !== "all" ? { category: effectiveCat } : {}),
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="flex items-center gap-2 text-sm font-bold">
        <SlidersHorizontal className="h-4 w-4 text-foreground" />
        {t("home.filters.title")}
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
      <Link
        to="/map"
        search={mapSearch}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface/50 px-3 py-2.5 text-sm font-bold transition-colors hover:border-foreground/30 hover:bg-surface"
      >
        {t("nav.more")}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
