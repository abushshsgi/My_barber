import { Link } from "@tanstack/react-router";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { cn } from "@/lib/utils";

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

  const mapSearch = {
    ...(query.trim() ? { q: query.trim() } : {}),
    ...(effectiveCat !== "all" ? { category: effectiveCat } : {}),
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border border-[#d5dde8] bg-[#e9eef6] p-4 shadow-sm",
        className,
      )}
    >
      <p className="flex shrink-0 items-center gap-2 text-sm font-bold">
        <SlidersHorizontal className="h-4 w-4 text-foreground" />
        {t("home.filters.title")}
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("common.search")}
        className="mt-3 w-full shrink-0 rounded-xl border border-[#cfd8e6] bg-white/80 px-3 py-2.5 text-sm focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
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
                : "text-foreground hover:bg-white/60",
            )}
          >
            {t(`home.categories.${key}`)}
          </button>
        ))}
      </div>
      <Link
        to="/map"
        search={mapSearch}
        className="mt-4 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-[#cfd8e6] bg-white/70 px-3 py-2.5 text-sm font-bold transition-colors hover:border-foreground/30 hover:bg-white"
      >
        {t("nav.more")}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
