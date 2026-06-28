import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/barber/primitives";
import { StatsGraphsPanel } from "@/components/barber/StatsGraphsPanel";
import { StatsRangePicker, StatsSectionTabs } from "@/components/barber/StatsSectionNav";
import { prefetchBarberAnalytics } from "@/hooks/use-barber-queries";
import { useBarberStatsMetrics } from "@/hooks/use-barber-stats";
import { statsRangeToIsoParams, type StatsRangeKey } from "@/lib/finance-range";
import { readOnboardingStatusCache } from "@/lib/onboarding-status-cache";

export const Route = createFileRoute("/barber/stats/graphs")({
  loader: ({ context: { queryClient } }) => {
    const cached = readOnboardingStatusCache();
    if (cached?.fully_ready !== true) return;
    const dates = statsRangeToIsoParams("30d");
    void prefetchBarberAnalytics(queryClient, dates);
  },
  component: StatsGraphsPage,
});

function StatsGraphsPage() {
  const [range, setRange] = useState<StatsRangeKey>("30d");
  const metrics = useBarberStatsMetrics(range);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Grafiklar"
        description="Barcha ko'rsatkichlar vizual shaklda — bir API so'rov bilan."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatsSectionTabs />
            <StatsRangePicker range={range} onChange={setRange} />
          </div>
        }
      />

      {metrics.isLoading && !metrics.dailyChart.hasData ? (
        <p className="text-sm text-muted-foreground">Grafiklar yuklanmoqda…</p>
      ) : null}

      {metrics.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Analitika yuklanmadi. Internetni tekshirib, qayta urinib ko&apos;ring.
        </p>
      ) : null}

      <StatsGraphsPanel metrics={metrics} />
    </div>
  );
}
