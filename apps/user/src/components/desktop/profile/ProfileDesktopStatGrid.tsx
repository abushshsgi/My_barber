import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { DESKTOP_GLASS_CARD } from "@/components/desktop/ui/desktop-glass";
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
                "grid h-10 w-10 place-items-center rounded-xl backdrop-blur-sm",
                tile.highlight ? "bg-background/20" : "bg-background/70",
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
          "flex items-center gap-4 p-4",
          tile.highlight
            ? "rounded-2xl border border-foreground/10 bg-foreground/92 text-background shadow-[0_12px_40px_-12px_rgba(15,15,15,0.3)] backdrop-blur-sm hover:opacity-95"
            : DESKTOP_GLASS_CARD,
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
