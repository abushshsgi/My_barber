import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/barber/stats", label: "Ko'rsatkichlar", exact: true },
  { to: "/barber/stats/graphs", label: "Grafiklar", exact: false },
] as const;

function isTabActive(pathname: string, to: string, exact: boolean) {
  if (exact) return pathname === to || pathname === `${to}/`;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function StatsSectionTabs() {
  const { pathname } = useLocation();

  return (
    <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
      {TABS.map((tab) => {
        const active = isTabActive(pathname, tab.to, tab.exact);
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
