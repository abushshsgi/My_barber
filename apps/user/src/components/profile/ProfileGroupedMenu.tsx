import { Link } from "@tanstack/react-router";
import { ChevronRight, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProfileGoMenuRow = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  to: string;
  search?: Record<string, string>;
  badge?: string;
  chevronClassName?: string;
};

type GroupProps = {
  items: ProfileGoMenuRow[];
  dark?: boolean;
  className?: string;
};

export function ProfileGoMenuGroup({ items, dark, className }: GroupProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl",
        dark ? "bg-foreground text-background" : "bg-surface/80",
        className,
      )}
    >
      {items.map((item, i) => {
        const Icon = item.icon;
        const isLast = i === items.length - 1;
        return (
          <Link
            key={item.title + item.to}
            to={item.to as never}
            search={item.search as never}
            className={cn(
              "flex items-center gap-3 px-4 py-3.5 active:opacity-90",
              !dark && "active:bg-surface",
              dark && "active:bg-background/10",
            )}
          >
            <div
              className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                dark ? "bg-background/15" : "bg-background",
              )}
            >
              <Icon className={cn("h-[18px] w-[18px]", dark && "text-background")} strokeWidth={2} />
            </div>
            <div
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 border-border py-0.5",
                !isLast && "border-b",
                dark ? "border-background/15" : "",
              )}
            >
              <div className="min-w-0 flex-1 py-1">
                <p className="text-[15px] font-bold leading-tight">{item.title}</p>
                {item.subtitle && (
                  <p
                    className={cn(
                      "mt-0.5 truncate text-[13px] font-medium",
                      dark ? "text-background/60" : "text-muted-foreground",
                    )}
                  >
                    {item.subtitle}
                  </p>
                )}
              </div>
              {item.badge ? (
                <span className="shrink-0 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                  {item.badge}
                </span>
              ) : (
                <ChevronRight
                  className={cn(
                    "h-5 w-5 shrink-0",
                    dark ? "text-background/50" : "text-muted-foreground/70",
                    item.chevronClassName,
                  )}
                  strokeWidth={2}
                />
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function ProfileWalletCard({
  title,
  balance,
  to = "/wallet",
}: {
  title: string;
  balance: string;
  hint?: string;
  to?: string;
}) {
  return (
    <Link
      to={to as never}
      className="flex items-center justify-between rounded-2xl bg-foreground px-4 py-4 text-background active:opacity-95"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-background/15">
          <Wallet className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums">{balance}</p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-background/50" strokeWidth={2} />
    </Link>
  );
}

type QuickProps = {
  items: { icon: LucideIcon; label: string; to: string }[];
};

export function ProfileGoQuickRow({ items }: QuickProps) {
  return (
    <div className="flex justify-between gap-1 px-1">
      {items.map(({ icon: Icon, label, to }) => (
        <Link
          key={to + label}
          to={to as never}
          className="flex flex-1 flex-col items-center gap-2.5 active:opacity-70"
        >
          <div className="grid h-[58px] w-[58px] place-items-center rounded-full bg-surface">
            <Icon className="h-[22px] w-[22px] text-foreground" strokeWidth={1.8} />
          </div>
          <span className="max-w-[72px] text-center text-[11px] font-bold leading-tight">{label}</span>
        </Link>
      ))}
    </div>
  );
}
