import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StatsPageHeader } from "@/components/admin/StatisticsShell";
import { Limitations, PeriodBar, useAnalyticsPeriod } from "@/components/admin/RevenueAnalytics";
import { fetchAnalyticsSources } from "@/lib/revenue-analytics";

export const Route = createFileRoute("/admin/analytics/sources")({
  component: SourcesPage,
});

function SourcesPage() {
  const period = useAnalyticsPeriod();
  const query = useQuery({
    queryKey: ["analytics", "sources", period.query],
    queryFn: () => fetchAnalyticsSources(period.query),
  });
  const data = query.data;
  return (
    <div className="space-y-6">
      <StatsPageHeader title="Trafik manbalari" description="Birinchi teginish. Reklama xarajati kiritilmaguncha ROAS, CPA va CAC yo'q." />
      <PeriodBar preset={period.preset} start={period.start} end={period.end} onPreset={period.setPreset} onStart={period.setStart} onEnd={period.setEnd} />
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              {["Manba", "Tashrif", "Ro'yxat", "Premium", "To'lov", "Sotuv", "Konversiya", "Tushum"].map((label) => (
                <th key={label} className="px-3 py-3 font-medium">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.rows ?? []).map((row) => (
              <tr key={row.source} className="border-t border-border">
                <td className="px-3 py-3">{row.source}</td>
                <td className="px-3 py-3">{row.visitors}</td>
                <td className="px-3 py-3">{row.registrations}</td>
                <td className="px-3 py-3">{row.premium_views}</td>
                <td className="px-3 py-3">{row.payment_attempts}</td>
                <td className="px-3 py-3">{row.purchases}</td>
                <td className="px-3 py-3">{row.conversion == null ? "—" : `${row.conversion}%`}</td>
                <td className="px-3 py-3">{row.revenue_uzs.toLocaleString("uz-UZ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">
        {data?.ad_cost_available ? `Reklama xarajati: ${data.ad_cost_uzs} so'm. ROAS hisobi keyin qo'shiladi.` : "Reklama xarajati mavjud emas."}
      </p>
      <Limitations items={data?.limitations} />
    </div>
  );
}
