import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { StatsRangeKey } from "@/lib/admin-analytics";

export function AdminBarberStatsNav({
  barberId,
  returnTo,
}: {
  barberId: string;
  returnTo?: string;
}) {
  const { pathname } = useLocation();
  const search = returnTo ? { returnTo } : {};

  const tabs = [
    {
      to: "/admin/barbers/$barberId/stats" as const,
      label: "Ko'rsatkichlar",
      match: (p: string) => p.endsWith("/stats") || p.endsWith("/stats/"),
    },
    {
      to: "/admin/barbers/$barberId/stats/graphs" as const,
      label: "Grafiklar",
      match: (p: string) => p.includes("/stats/graphs"),
    },
  ];

  return (
    <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          params={{ barberId }}
          search={search}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-colors",
            tab.match(pathname)
              ? "bg-background font-medium shadow-card"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export function AdminStatsRangePicker({
  range,
  onChange,
}: {
  range: StatsRangeKey;
  onChange: (range: StatsRangeKey) => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
      {(["7d", "30d", "90d"] as const).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm",
            range === k ? "bg-background font-medium shadow-card" : "text-muted-foreground",
          )}
        >
          {k === "7d" ? "7 kun" : k === "30d" ? "30 kun" : "90 kun"}
        </button>
      ))}
    </div>
  );
}
