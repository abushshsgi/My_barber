import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { formatPrice } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export type StatTile = {
  label: string;
  value: string;
  to?: string;
  icon: LucideIcon;
  highlight?: boolean;
};

type Props = {
  tiles: StatTile[];
};

export function ProfileDesktopStatGrid({ tiles }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        const inner = (
          <>
            <div
              className={cn(
                "grid h-10 w-10 place-items-center rounded-xl",
                tile.highlight ? "bg-background/15" : "bg-surface",
              )}
            >
              <Icon
                className={cn("h-5 w-5", tile.highlight ? "text-background" : "text-foreground")}
                strokeWidth={1.9}
              />
            </div>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-[11px] font-bold uppercase tracking-wide",
                  tile.highlight ? "text-background/70" : "text-muted-foreground",
                )}
              >
                {tile.label}
              </p>
              <p
                className={cn(
                  "mt-1 truncate text-xl font-bold tabular-nums tracking-tight",
                  tile.highlight ? "text-background" : "text-foreground",
                )}
              >
                {tile.value}
              </p>
            </div>
          </>
        );

        const className = cn(
          "flex items-center gap-4 rounded-2xl border p-4 transition-all",
          tile.highlight
            ? "border-foreground bg-foreground text-background shadow-sm hover:opacity-95"
            : "border-border bg-background hover:border-foreground/15 hover:shadow-sm",
        );

        if (tile.to) {
          return (
            <Link key={tile.label} to={tile.to as never} className={className}>
              {inner}
            </Link>
          );
        }

        return (
          <div key={tile.label} className={className}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

export function formatWalletStat(balance: number, loading: boolean): string {
  if (loading) return "…";
  return formatPrice(balance);
}
