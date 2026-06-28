import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminBarberGraphsPanel } from "@/components/admin/AdminBarberGraphsPanel";
import {
  AdminBarberStatsNav,
  AdminStatsRangePicker,
} from "@/components/admin/AdminBarberStatsNav";
import { barberDetailSearchFromRaw } from "@/lib/admin-nav";
import type { StatsRangeKey } from "@/lib/admin-analytics";
import { useAdminBarberStatsMetrics } from "@/hooks/use-admin-barber-stats";

export const Route = createFileRoute("/admin/barbers/$barberId/stats/graphs")({
  validateSearch: (raw: Record<string, unknown>) => barberDetailSearchFromRaw(raw),
  component: AdminBarberGraphsPage,
});

function AdminBarberGraphsPage() {
  const { barberId } = Route.useParams();
  const search = Route.useSearch();
  const [range, setRange] = useState<StatsRangeKey>("30d");
  const metrics = useAdminBarberStatsMetrics(barberId, range);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold">Grafiklar</h2>
          <p className="text-sm text-muted-foreground">
            To&apos;liq vizual tahlil — daromad, mijozlar, xizmatlar
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminBarberStatsNav barberId={barberId} returnTo={search.returnTo} />
          <AdminStatsRangePicker range={range} onChange={setRange} />
        </div>
      </div>

      {metrics.isLoading && !metrics.dailyChart.hasData ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Grafiklar yuklanmoqda…
        </div>
      ) : null}

      {metrics.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Analitika yuklanmadi.
        </p>
      ) : null}

      {!metrics.isLoading || metrics.dailyChart.hasData ? (
        <AdminBarberGraphsPanel metrics={metrics} />
      ) : null}
    </div>
  );
}
