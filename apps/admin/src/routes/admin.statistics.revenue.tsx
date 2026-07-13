import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Banknote, CreditCard, TrendingUp } from "lucide-react";
import { downloadStatisticsCsv, fetchPlatformRevenue } from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatsPageHeader, useStatsRange } from "@/components/admin/StatisticsShell";
import { RevenueStackedBarChart } from "@/components/admin/StatsCharts";

export const Route = createFileRoute("/admin/statistics/revenue")({
  component: StatisticsRevenuePage,
});

function StatisticsRevenuePage() {
  const { rangeKey, setRangeKey, range } = useStatsRange("90d");

  const q = useQuery({
    queryKey: ["admin", "stats-revenue", range.start, range.end],
    queryFn: () => fetchPlatformRevenue(range, "month"),
    refetchInterval: 15_000,
  });

  const d = q.data;

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Daromad"
        description="Oyma-oy daromad, naqd va onlayn to'lovlar ajratilgan holda."
        rangeKey={rangeKey}
        onRangeChange={setRangeKey}
        onExport={() => downloadStatisticsCsv("revenue", { range, granularity: "month" })}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {q.isLoading || !d ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KPICard label="Jami daromad (GMV)" value={formatAdminUzs(d.summary.gmv)} icon={TrendingUp} />
            <KPICard label="Naqd" value={formatAdminUzs(d.summary.cash_total)} icon={Banknote} hint={`${d.summary.cash_count} ta bron`} />
            <KPICard label="Onlayn" value={formatAdminUzs(d.summary.online_total)} icon={CreditCard} hint={`${d.summary.online_count} ta bron`} />
            <KPICard
              label="Onlayn ulush"
              value={`${d.summary.gmv > 0 ? Math.round((d.summary.online_total / d.summary.gmv) * 100) : 0}%`}
            />
          </>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Oyma-oy daromad</h2>
        <p className="text-sm text-muted-foreground mt-1">Naqd (yashil) va onlayn (ko'k) ustma-ust</p>
        {q.isLoading || !d ? (
          <div className="mt-6 h-56 animate-pulse rounded-xl bg-muted/40" />
        ) : d.series.length === 0 ? (
          <EmptyState title="Ma'lumot yo'q" description="Tanlangan davrda daromad qayd etilmagan." />
        ) : (
          <div className="mt-4">
            <RevenueStackedBarChart series={d.series} />
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500/80" /> Naqd
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-blue-500/80" /> Onlayn
          </span>
        </div>
      </div>

      {d && d.series.length > 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-heading text-lg font-semibold">Oylik jadval</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Davr</th>
                  <th className="px-6 py-3 font-medium text-right">Jami</th>
                  <th className="px-6 py-3 font-medium text-right">Naqd</th>
                  <th className="px-6 py-3 font-medium text-right">Onlayn</th>
                  <th className="px-6 py-3 font-medium text-right">Bronlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.series.map((point) => (
                  <tr key={point.key} className="hover:bg-background/50">
                    <td className="px-6 py-4 font-medium">{point.label}</td>
                    <td className="px-6 py-4 text-right tabular-nums font-semibold">{formatAdminUzs(point.total)}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">{formatAdminUzs(point.cash)}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">{formatAdminUzs(point.online)}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{point.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopList title="Top sartaroshlar" rows={d?.top_barbers ?? []} loading={q.isLoading} />
        <TopList title="Top salonlar" rows={d?.top_salons ?? []} loading={q.isLoading} />
      </div>
    </div>
  );
}

function TopList({
  title,
  rows,
  loading,
}: {
  title: string;
  rows: Array<{ id: number; name: string; revenue: number; count: number }>;
  loading: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted/40" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Ma'lumot yo'q.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {rows.map((row, i) => (
            <li key={row.id} className="flex items-center gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</span>
              <span className="text-xs text-muted-foreground">{row.count} bron</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{formatAdminUzs(row.revenue)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
