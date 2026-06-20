import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type AccountHubTile = {
  title: string;
  description: string;
  to: string;
  meta?: string;
  search?: Record<string, string>;
  badge?: string;
};

type Props = {
  tiles: AccountHubTile[];
};

/** Airbnb-style account hub — uniform bordered tiles in a grid. */
export function ProfileAccountHubGrid({ tiles }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {tiles.map((tile) => (
        <Link
          key={tile.to}
          to={tile.to as never}
          search={tile.search as never}
          className={cn(
            "group flex min-h-[148px] flex-col rounded-xl border border-border bg-background p-6",
            "shadow-[0_1px_2px_rgba(15,15,15,0.04)] transition-all duration-200",
            "hover:border-foreground/20 hover:shadow-[0_8px_24px_-12px_rgba(15,15,15,0.12)]",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold leading-snug text-foreground">{tile.title}</h2>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          </div>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{tile.description}</p>
          {(tile.meta || tile.badge) && (
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-4">
              {tile.meta ? (
                <p className="truncate text-sm font-medium text-foreground">{tile.meta}</p>
              ) : (
                <span />
              )}
              {tile.badge ? (
                <span className="shrink-0 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                  {tile.badge}
                </span>
              ) : null}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
