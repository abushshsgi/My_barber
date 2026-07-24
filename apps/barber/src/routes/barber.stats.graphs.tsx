import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/barber/primitives";
import { ShopPaywall } from "@/components/barber/ShopPaywall";
import { StatsGraphsPanel } from "@/components/barber/StatsGraphsPanel";
import { StatsRangePicker, StatsSectionTabs } from "@/components/barber/StatsSectionNav";
import { prefetchBarberAnalytics } from "@/hooks/use-barber-queries";
import { useBarberStatsMetrics } from "@/hooks/use-barber-stats";
import { useShopSubscriptionMe } from "@/hooks/use-shop-subscription";
import { featureAllowed } from "@/lib/shop-subscription";
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
  const { data: shopMe } = useShopSubscriptionMe();

  if (!featureAllowed(shopMe?.entitlements, "stats_graphs")) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
        <PageHeader title="Grafiklar" description="Vizual tahlil." />
        <ShopPaywall
          title="Grafiklar — Business+"
          description="To'liq grafiklar Start tarifida yo'q."
          requiredPlan="business"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Grafiklar"
        description="Daromad, faollik va mijozlar bo'yicha vizual tahlil."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatsSectionTabs />
            <StatsRangePicker range={range} onChange={setRange} />
          </div>
        }
      />

      {metrics.isLoading && !metrics.dailyChart.hasData ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-8 text-sm text-muted-foreground shadow-card">
          <Loader2 className="size-4 animate-spin" />
          Grafiklar yuklanmoqda…
        </div>
      ) : null}

      {metrics.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Analitika yuklanmadi. Internetni tekshirib, qayta urinib ko&apos;ring.
        </div>
      ) : null}

      {!metrics.isLoading || metrics.dailyChart.hasData ? (
        <StatsGraphsPanel metrics={metrics} />
      ) : null}

      {!metrics.isLoading && metrics.dailyChart.hasData ? (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <BarChart3 className="size-3.5" />
          Ma&apos;lumotlar tanlangan davr bo&apos;yicha real vaqtga yaqin yangilanadi.
        </p>
      ) : null}
    </div>
  );
}
