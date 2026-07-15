import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminBarberGraphsPanel } from "@/components/admin/AdminBarberGraphsPanel";
import {
  AdminSalonStatsNav,
  AdminStatsRangePicker,
} from "@/components/admin/AdminSalonStatsNav";
import type { StatsRangeKey } from "@/lib/admin-analytics";
import { useAdminSalonStatsMetrics } from "@/hooks/use-admin-salon-stats";
import type { AdminBarberStatsMetrics } from "@/hooks/use-admin-barber-stats";

export const Route = createFileRoute("/admin/salons/$salonId/stats/graphs")({
  component: AdminSalonStatsGraphsPage,
});

function AdminSalonStatsGraphsPage() {
  const { salonId } = Route.useParams();
  const [range, setRange] = useState<StatsRangeKey>("30d");
  const metrics = useAdminSalonStatsMetrics(salonId, range);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold">Grafiklar</h2>
          <p className="text-sm text-muted-foreground">
            Salon bo&apos;yicha daromad, mijozlar va xizmatlar
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminSalonStatsNav salonId={salonId} />
          <AdminStatsRangePicker range={range} onChange={setRange} />
        </div>
      </div>

      {metrics.isLoading && !metrics.dailyChart.hasData ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Grafiklar yuklanmoqda…
        </div>
      ) : (
        <AdminBarberGraphsPanel metrics={metrics as AdminBarberStatsMetrics} />
      )}
    </div>
  );
}
