import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { cn } from "@/lib/utils";

export { BazaarMapPanel } from "./BazaarMapPanel";
export { BazaarHeroBanner } from "./BazaarHeroBanner";
export { BazaarFilterSidebar } from "./BazaarFilterSidebar";

export function BazaarGridSkeleton({ cols }: { cols: number }) {
  return (
    <div className={cn("grid gap-4", cols === 2 && "grid-cols-2", cols === 3 && "grid-cols-3", cols === 4 && "grid-cols-4", cols === 5 && "grid-cols-5")}>
      {Array.from({ length: cols * 3 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[5/4] rounded-xl bg-surface" />
          <div className="mt-3 h-4 w-2/3 rounded bg-surface" />
        </div>
      ))}
    </div>
  );
}

export function BazaarPageTitle({
  title,
  count,
  className,
  hideCount,
}: {
  title: string;
  count?: number;
  className?: string;
  hideCount?: boolean;
}) {
  return (
    <div className={cn("mb-6 flex items-baseline gap-3", className)}>
      <h2 className="text-xl font-bold tracking-tight xl:text-2xl">{title}</h2>
      {!hideCount && count != null ? (
        <span className="rounded-full bg-foreground px-3 py-1 text-sm font-bold text-background">
          {count}
        </span>
      ) : null}
    </div>
  );
}

export function BazaarSectionHeader({
  title,
  count,
  viewAllTo,
  className,
}: {
  title: string;
  count?: number;
  viewAllTo?: string;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <BazaarPageTitle title={title} count={count} className="mb-0" />
      {viewAllTo ? (
        <Link
          to={viewAllTo}
          className="shrink-0 pb-1 text-sm font-bold text-foreground underline-offset-4 hover:underline"
        >
          {t("common.viewAll")}
        </Link>
      ) : null}
    </div>
  );
}
