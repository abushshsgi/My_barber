import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Limitations, useAnalyticsPeriod } from "@/components/admin/RevenueAnalytics";
import {
  AnalyticsEmpty,
  AnalyticsError,
  AnalyticsSkeleton,
  FetchBar,
  SectionIntro,
  errorText,
} from "@/components/admin/analytics-shell";
import { Panel } from "@/components/admin/analytics-blocks";
import { fetchAnalyticsSources } from "@/lib/revenue-analytics";

export const Route = createFileRoute("/admin/analytics/sources")({
  component: SourcesPage,
});

function SourcesPage() {
  const period = useAnalyticsPeriod();
  const query = useQuery({
    queryKey: ["analytics", "sources", period.query],
    queryFn: () => fetchAnalyticsSources(period.query),
    placeholderData: keepPreviousData,
  });
  const data = query.data;
  if (query.isPending && !data) return <AnalyticsSkeleton rows={2} />;
  if (query.isError)
    return <AnalyticsError message={errorText(query.error)} onRetry={() => void query.refetch()} />;
  if (!data) return null;
  const max = Math.max(1, ...data.rows.map((row) => row.visitors));

  return (
    <div
      className={query.isPlaceholderData ? "space-y-5 opacity-80 transition-opacity" : "space-y-5"}
    >
      <FetchBar active={query.isFetching} />
      <SectionIntro
        title="Trafik manbalari"
        description="Birinchi teginish. Reklama xarajati kiritilmaguncha ROAS, CPA va CAC yo'q."
      />
      {data.rows.length === 0 ? (
        <AnalyticsEmpty
          title="Manba yo'q"
          description="Bu davrda birinchi teginish yozuvi kelmagan."
        />
      ) : (
        <Panel title="Tashrif ulushi">
          <ul className="space-y-3">
            {data.rows.map((row) => (
              <li key={row.source}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{row.source}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {row.visitors.toLocaleString("uz-UZ")} ·{" "}
                    {row.conversion == null ? "—" : `${row.conversion}%`}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/80 transition-[width] duration-500 motion-reduce:transition-none"
                    style={{
                      width: `${Math.max(row.visitors > 0 ? 3 : 0, (row.visitors / max) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              {[
                "Manba",
                "Tashrif",
                "Ro'yxat",
                "Premium",
                "To'lov",
                "Sotuv",
                "Konversiya",
                "Tushum",
              ].map((label) => (
                <th key={label} className="px-4 py-3 font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.source} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{row.source}</td>
                <td className="px-4 py-3 tabular-nums">{row.visitors}</td>
                <td className="px-4 py-3 tabular-nums">{row.registrations}</td>
                <td className="px-4 py-3 tabular-nums">{row.premium_views}</td>
                <td className="px-4 py-3 tabular-nums">{row.payment_attempts}</td>
                <td className="px-4 py-3 tabular-nums">{row.purchases}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-foreground/80"
                        style={{ width: `${Math.max(0, Math.min(100, row.conversion ?? 0))}%` }}
                      />
                    </div>
                    <span className="tabular-nums">
                      {row.conversion == null ? "—" : `${row.conversion}%`}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {row.revenue_uzs.toLocaleString("uz-UZ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">
        {data.ad_cost_available
          ? `Reklama xarajati: ${data.ad_cost_uzs ?? 0} so'm. ROAS hisobi keyin qo'shiladi.`
          : "Reklama xarajati mavjud emas."}
      </p>
      <Limitations items={data.limitations} />
    </div>
  );
}
