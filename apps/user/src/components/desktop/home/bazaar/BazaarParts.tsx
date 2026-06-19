import { Link } from "@tanstack/react-router";
import { Calendar, Map, SlidersHorizontal, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { cn } from "@/lib/utils";

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

type MapProps = { tall?: boolean; className?: string };

export function BazaarMapPanel({ tall, className }: MapProps) {
  const { t } = useTranslation();
  return (
    <div className={cn("space-y-3", className)}>
      <Link
        to="/map"
        className={cn(
          "group flex flex-col items-center justify-center rounded-2xl border-2 border-border bg-surface p-5 text-center transition-all hover:border-foreground/30 hover:shadow-md",
          tall ? "min-h-[320px]" : "min-h-[200px]",
        )}
      >
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-foreground text-background">
          <Map className="h-7 w-7" />
        </div>
        <p className="mt-4 text-base font-bold">{t("common.viewMap")}</p>
        <p className="mt-1 text-xs text-muted-foreground">Yaqin salonlarni xaritada toping</p>
      </Link>
      <Link
        to="/today"
        className="flex items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-sm font-bold text-background shadow-sm transition-opacity hover:opacity-90"
      >
        <Calendar className="h-4 w-4" />
        {t("homePage.quick.today")}
      </Link>
      <Link
        to="/ai-style"
        className="flex items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-semibold hover:bg-surface"
      >
        <Sparkles className="h-4 w-4 text-foreground" />
        {t("homePage.quick.aiStyle")}
      </Link>
    </div>
  );
}

export function BazaarGridSkeleton({ cols }: { cols: number }) {
  return (
    <div className={cn("grid gap-5", cols === 2 && "grid-cols-2", cols === 3 && "grid-cols-3", cols === 4 && "grid-cols-4", cols === 5 && "grid-cols-5")}>
      {Array.from({ length: cols * 3 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square rounded-2xl bg-surface" />
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
