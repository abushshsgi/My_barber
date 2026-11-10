import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StatsPageHeader } from "@/components/admin/StatisticsShell";
import { AnalyticsKpiCard, Limitations, PeriodBar, useAnalyticsPeriod } from "@/components/admin/RevenueAnalytics";
import { fetchAnalyticsPayments } from "@/lib/revenue-analytics";

export const Route = createFileRoute("/admin/analytics/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const period = useAnalyticsPeriod();
  const query = useQuery({
    queryKey: ["analytics", "payments", period.query],
    queryFn: () => fetchAnalyticsPayments(period.query),
  });
  const rates = query.data?.rates;
  return (
    <div className="space-y-6">
      <StatsPageHeader title="Payme to'lovlari" description="Tasdiq faqat serverdagi Payme tekshiruvidan. Yo'naltirish sahifa ochilganini bildirmaydi." />
      <PeriodBar preset={period.preset} start={period.start} end={period.end} onPreset={period.setPreset} onStart={period.setStart} onEnd={period.setEnd} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(query.data?.kpis ?? []).map((kpi) => (
          <AnalyticsKpiCard key={kpi.key} kpi={kpi} />
        ))}
      </div>
      {rates ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Stat label="To'lov tasdiq ulushi" value={rates.success_rate} suffix="%" />
          <Stat label="Yo'naltirishdan tasdiqqacha" value={rates.checkout_to_payment_rate} suffix="%" />
          <Stat label="O'rtacha tasdiqlangan summa" value={rates.average_amount_uzs} suffix=" so'm" />
        </div>
      ) : null}
      {query.data?.note ? <p className="text-sm text-muted-foreground">{query.data.note}</p> : null}
      <Limitations items={query.data?.limitations} />
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number | null; suffix: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value == null ? "—" : `${value.toLocaleString("uz-UZ")}${suffix}`}</div>
    </div>
  );
}
