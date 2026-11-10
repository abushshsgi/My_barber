import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StatsPageHeader } from "@/components/admin/StatisticsShell";
import { Limitations, PeriodBar, useAnalyticsPeriod } from "@/components/admin/RevenueAnalytics";
import { fetchAnalyticsAi } from "@/lib/revenue-analytics";

export const Route = createFileRoute("/admin/analytics/ai")({
  component: AiPage,
});

function AiPage() {
  const period = useAnalyticsPeriod();
  const query = useQuery({
    queryKey: ["analytics", "ai", period.query],
    queryFn: () => fetchAnalyticsAi(period.query),
  });
  const data = query.data;
  const rows: [string, string][] = data
    ? [
        ["Try-on ochilishi", data.tryon_page_views_available ? String(data.tryon_page_views ?? 0) : "Kuzatuv yo'q"],
        ["Uslub tanlovi", data.styles_selected == null ? "Kuzatuv yo'q" : String(data.styles_selected)],
        ["Generatsiya so'rovi", String(data.generation_requests)],
        ["Navbatda", String(data.queued)],
        ["Jarayonda", String(data.processing)],
        ["Yakunlangan", String(data.completed)],
        ["Xato", String(data.failed)],
        ["Bekor", String(data.cancelled)],
        ["Muvaffaqiyat", data.success_rate == null ? "—" : `${data.success_rate}%`],
        ["O'rtacha vaqt, ms", data.avg_latency_ms == null ? "—" : String(data.avg_latency_ms)],
        ["Yozilgan xarajat, USD", data.recorded_cost_usd ?? "Yo'q"],
        ["Taxminiy xarajat, USD", data.estimated_cost_usd ?? "Yo'q"],
        ["Bepul generatsiya", String(data.free_generations)],
        ["Premium generatsiya", String(data.premium_generations)],
        ["AI faolligi", data.engagement_rate == null ? "—" : `${data.engagement_rate}%`],
        ["AI dan Premiumga", data.ai_to_premium_rate == null ? "—" : `${data.ai_to_premium_rate}%`],
        ["Faol userga xarajat", data.cost_per_active_user_usd ?? "Yo'q"],
        ["To'lovchiga xarajat", data.cost_per_paying_user_usd ?? "Yo'q"],
      ]
    : [];
  return (
    <div className="space-y-6">
      <StatsPageHeader title="AI statistikasi" description="Runware yozuvlaridagi xarajat. Taxmin va haqiqiy hisob alohida." />
      <PeriodBar preset={period.preset} start={period.start} end={period.end} onPreset={period.setPreset} onStart={period.setStart} onEnd={period.setEnd} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>
      {data?.error_categories.length ? (
        <ul className="space-y-1 text-sm">
          {data.error_categories.map((row) => (
            <li key={row.category}>
              {row.category}: {row.count}
            </li>
          ))}
        </ul>
      ) : null}
      <Limitations items={data?.limitations} />
    </div>
  );
}
