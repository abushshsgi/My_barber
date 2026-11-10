import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Limitations, useAnalyticsPeriod } from "@/components/admin/RevenueAnalytics";
import {
  AnalyticsError,
  AnalyticsSkeleton,
  FetchBar,
  SectionIntro,
  errorText,
} from "@/components/admin/analytics-shell";
import {
  MetricBand,
  SeriesExplorer,
  metricFromKpi,
  ownedSeries,
} from "@/components/admin/analytics-blocks";
import { fetchAnalyticsVisitors } from "@/lib/revenue-analytics";

export const Route = createFileRoute("/admin/analytics/visitors")({
  component: VisitorsPage,
});

function VisitorsPage() {
  const period = useAnalyticsPeriod();
  const query = useQuery({
    queryKey: ["analytics", "visitors", period.query],
    queryFn: () => fetchAnalyticsVisitors(period.query),
    placeholderData: keepPreviousData,
  });
  const data = query.data;
  if (query.isPending && !data) return <AnalyticsSkeleton rows={1} />;
  if (query.isError)
    return <AnalyticsError message={errorText(query.error)} onRetry={() => void query.refetch()} />;
  if (!data) return null;
  const metrics = data.kpis.map((kpi) => metricFromKpi(kpi, ownedSeries(kpi, data.kpis)));
  return (
    <div
      className={query.isPlaceholderData ? "space-y-5 opacity-80 transition-opacity" : "space-y-5"}
    >
      <FetchBar active={query.isFetching} />
      <SectionIntro
        title="Tashriflar"
        description={
          data.total_basis === "sessions"
            ? "Jami tashrif sessiyalar bo'yicha."
            : "Sessiya tarixi yo'q, jami noyob odamlar bilan bir xil."
        }
      />
      <MetricBand metrics={metrics} />
      <SeriesExplorer
        kpis={data.kpis}
        title="Kunlik noyob tashrif"
        description="Barcha tashrif KPI lari shu kunlik qatorni ulashadi."
      />
      <Limitations items={data.limitations} />
    </div>
  );
}
