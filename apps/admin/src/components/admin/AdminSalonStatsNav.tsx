import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { AdminStatsRangePicker } from "@/components/admin/AdminBarberStatsNav";

export { AdminStatsRangePicker };

export function AdminSalonStatsNav({ salonId }: { salonId: string }) {
  const { pathname } = useLocation();

  const tabs = [
    {
      to: "/admin/salons/$salonId/stats" as const,
      label: "Ko'rsatkichlar",
      match: (p: string) => p.endsWith("/stats") || p.endsWith("/stats/"),
    },
    {
      to: "/admin/salons/$salonId/stats/graphs" as const,
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
          params={{ salonId }}
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
