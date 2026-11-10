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
import { Panel } from "@/components/admin/analytics-blocks";
import { fetchAnalyticsAi } from "@/lib/revenue-analytics";

export const Route = createFileRoute("/admin/analytics/ai")({
  component: AiPage,
});

function AiPage() {
  const period = useAnalyticsPeriod();
  const query = useQuery({
    queryKey: ["analytics", "ai", period.query],
    queryFn: () => fetchAnalyticsAi(period.query),
    placeholderData: keepPreviousData,
  });
  const data = query.data;
  if (query.isPending && !data) return <AnalyticsSkeleton rows={2} />;
  if (query.isError)
    return <AnalyticsError message={errorText(query.error)} onRetry={() => void query.refetch()} />;
  if (!data) return null;

  const pipeline = [
    ["So'rov", data.generation_requests],
    ["Navbat", data.queued],
    ["Jarayon", data.processing],
    ["Tayyor", data.completed],
    ["Xato", data.failed],
    ["Bekor", data.cancelled],
  ] as const;
  const max = Math.max(1, ...pipeline.map(([, value]) => value));
  const cost = [
    ["Yozilgan xarajat, USD", data.recorded_cost_usd ?? "Yo'q"],
    ["Taxminiy xarajat, USD", data.estimated_cost_usd ?? "Yo'q"],
    ["Faol userga xarajat", data.cost_per_active_user_usd ?? "Yo'q"],
    ["To'lovchiga xarajat", data.cost_per_paying_user_usd ?? "Yo'q"],
  ] as const;
  const usage = [
    [
      "Try-on ochilishi",
      data.tryon_page_views_available ? String(data.tryon_page_views ?? 0) : "Kuzatuv yo'q",
    ],
    ["Uslub tanlovi", data.styles_selected == null ? "Kuzatuv yo'q" : String(data.styles_selected)],
    ["Bepul generatsiya", String(data.free_generations)],
    ["Premium generatsiya", String(data.premium_generations)],
    ["AI faolligi", data.engagement_rate == null ? "—" : `${data.engagement_rate}%`],
    ["AI dan Premiumga", data.ai_to_premium_rate == null ? "—" : `${data.ai_to_premium_rate}%`],
    ["Muvaffaqiyat", data.success_rate == null ? "—" : `${data.success_rate}%`],
    ["O'rtacha vaqt, ms", data.avg_latency_ms == null ? "—" : String(data.avg_latency_ms)],
  ] as const;

  return (
    <div
      className={query.isPlaceholderData ? "space-y-5 opacity-80 transition-opacity" : "space-y-5"}
    >
      <FetchBar active={query.isFetching} />
      <SectionIntro
        title="AI analitika"
        description="Runware yozuvlaridagi xarajat. Taxmin va haqiqiy hisob alohida."
      />
      <Panel title="Generatsiya oqimi">
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {pipeline.map(([label, value]) => (
            <li key={label} className="rounded-xl border border-border px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {label}
              </div>
              <div className="mt-1 font-heading text-2xl font-semibold tabular-nums">
                {value.toLocaleString("uz-UZ")}
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground/80"
                  style={{ width: `${(value / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Foydalanish va konversiya" bodyClassName="p-0">
          <ul>
            {usage.map(([label, value]) => (
              <li
                key={label}
                className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums">{value}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="space-y-4">
          <Panel title="Xarajat" bodyClassName="p-0">
            <ul>
              {cost.map(([label, value]) => (
                <li
                  key={label}
                  className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
                >
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="font-medium tabular-nums">{value}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Xato turlari">
            {data.error_categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Bu davrda xato turi yo'q.</p>
            ) : (
              <ul className="space-y-3">
                {data.error_categories.map((row) => {
                  const top = Math.max(...data.error_categories.map((item) => item.count), 1);
                  return (
                    <li key={row.category}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{row.category}</span>
                        <span className="tabular-nums">{row.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-destructive/80"
                          style={{ width: `${(row.count / top) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
      <Limitations items={data.limitations} />
    </div>
  );
}
