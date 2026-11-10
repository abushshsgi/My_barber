import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StatsPageHeader } from "@/components/admin/StatisticsShell";
import { Limitations, PeriodBar, useAnalyticsPeriod } from "@/components/admin/RevenueAnalytics";
import { fetchAnalyticsRevenue } from "@/lib/revenue-analytics";

export const Route = createFileRoute("/admin/analytics/revenue")({
  component: RevenuePage,
});

function RevenuePage() {
  const period = useAnalyticsPeriod();
  const query = useQuery({
    queryKey: ["analytics", "revenue", period.query],
    queryFn: () => fetchAnalyticsRevenue(period.query),
  });
  const data = query.data;
  const rows: [string, string][] = data
    ? [
        ["Tasdiqlangan tushum", money(data.confirmed_revenue_uzs)],
        ["Premium tushumi", money(data.premium_revenue_uzs)],
        ["Yangi to'lovchilar", String(data.new_paying_customers)],
        ["Qaytgan to'lovchilar", String(data.returning_paying_customers)],
        ["Faol pullik obuna", String(data.active_paid_subscriptions)],
        ["Muddati tugagan", String(data.expired_subscriptions)],
        ["Bekor qilingan", String(data.cancelled_subscriptions)],
        ["Qaytarilgan", money(data.refunded_uzs)],
        ["Sof tushum", money(data.net_revenue_uzs)],
        ["To'lovchiga o'rtacha", data.arppu_uzs == null ? "—" : money(data.arppu_uzs)],
        ["Tashrifga o'rtacha", data.arpu_uzs == null ? "—" : money(data.arpu_uzs)],
        ["MRR", "Mavjud emas"],
        ["30 kunlik huquq qiymati", money(data.active_entitlement_value_uzs)],
        ["Daromad konversiyasi", data.revenue_conversion == null ? "—" : `${data.revenue_conversion}%`],
      ]
    : [];
  return (
    <div className="space-y-6">
      <StatsPageHeader title="Daromad" description="Tasdiqlangan Payme to'lovlari. Kutilayotgan summa kirmaydi. Bir martalik to'lov MRR emas." />
      <PeriodBar preset={period.preset} start={period.start} end={period.end} onPreset={period.setPreset} onStart={period.setStart} onEnd={period.setEnd} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>
      <Limitations items={data?.limitations} />
    </div>
  );
}

function money(value: number) {
  return `${Math.round(value).toLocaleString("uz-UZ")} so'm`;
}
