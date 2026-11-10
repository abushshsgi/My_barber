import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StatsPageHeader } from "@/components/admin/StatisticsShell";
import { AnalyticsKpiCard, Limitations, PeriodBar, useAnalyticsPeriod } from "@/components/admin/RevenueAnalytics";
import { fetchAnalyticsVisitors } from "@/lib/revenue-analytics";

export const Route = createFileRoute("/admin/analytics/visitors")({
  component: VisitorsPage,
});

function VisitorsPage() {
  const period = useAnalyticsPeriod();
  const query = useQuery({
    queryKey: ["analytics", "visitors", period.query],
    queryFn: () => fetchAnalyticsVisitors(period.query),
  });
  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Tashrif buyuruvchilar"
        description={query.data?.total_basis === "sessions" ? "Jami tashrif sessiyalar bo'yicha." : "Sessiya tarixi yo'q, jami noyob odamlar bilan bir xil."}
      />
      <PeriodBar preset={period.preset} start={period.start} end={period.end} onPreset={period.setPreset} onStart={period.setStart} onEnd={period.setEnd} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(query.data?.kpis ?? []).map((kpi) => (
          <AnalyticsKpiCard key={kpi.key} kpi={kpi} />
        ))}
      </div>
      <Limitations items={query.data?.limitations} />
    </div>
  );
}
