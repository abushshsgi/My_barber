import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/barber/stats", label: "Ko'rsatkichlar" },
  { to: "/barber/stats/graphs", label: "Grafiklar" },
] as const;

export function StatsSectionTabs() {
  const { pathname } = useLocation();

  return (
    <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
      {TABS.map((tab) => {
        const active = pathname === tab.to;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active ? "bg-background font-medium shadow-card" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

export function StatsRangePicker({
  range,
  onChange,
}: {
  range: "7d" | "30d" | "90d";
  onChange: (range: "7d" | "30d" | "90d") => void;
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
