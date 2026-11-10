import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StatsPageHeader } from "@/components/admin/StatisticsShell";
import { AnalyticsKpiCard, Limitations, PeriodBar, useAnalyticsPeriod } from "@/components/admin/RevenueAnalytics";
import { fetchAnalyticsOverview } from "@/lib/revenue-analytics";

export const Route = createFileRoute("/admin/analytics/")({
  component: OverviewPage,
});

function questionText(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number") return value.toLocaleString("uz-UZ");
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "change_percent" in value) {
    const row = value as { change_percent: number | null; change_state: string; current?: number; previous?: number };
    if (row.change_state !== "defined" || row.change_percent == null) return "Taqqoslab bo'lmaydi";
    return `${row.change_percent > 0 ? "+" : ""}${row.change_percent}%`;
  }
  if (Array.isArray(value)) return value.length ? `${value.length} ta qator` : "Hali yo'q";
  if (typeof value === "object" && value && "label" in value) {
    const row = value as { label?: string; drop_off?: number; drop_off_percent?: number | null };
    return `${row.label || ""}: ${row.drop_off ?? 0} (${row.drop_off_percent ?? "—"}%)`;
  }
  if (typeof value === "object" && value && "users" in value) {
    const row = value as { users?: number; events?: number };
    return `${row.users ?? 0} kishi, ${row.events ?? 0} voqea`;
  }
  return "—";
}

function OverviewPage() {
  const period = useAnalyticsPeriod();
  const query = useQuery({
    queryKey: ["analytics", "overview", period.query],
    queryFn: () => fetchAnalyticsOverview(period.query),
  });
  const data = query.data;
  return (
    <div className="space-y-6">
      <StatsPageHeader title="Umumiy analitika" description="Tashrifdan tasdiqlangan obunagacha bo'lgan haqiqiy ko'rsatkichlar." />
      <PeriodBar preset={period.preset} start={period.start} end={period.end} onPreset={period.setPreset} onStart={period.setStart} onEnd={period.setEnd} />
      {data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Mini label="Bugun" value={data.traffic_days.today} />
          <Mini label="Kecha" value={data.traffic_days.yesterday} />
          <Mini label="3 kun oldin" value={data.traffic_days.days_ago_3} />
          <Mini label="7 kun oldin" value={data.traffic_days.days_ago_7} />
          <Mini label="30 kun oldin" value={data.traffic_days.days_ago_30} />
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(data?.kpis ?? []).map((kpi) => (
          <AnalyticsKpiCard key={kpi.key} kpi={kpi} />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {(data?.questions ?? []).map((item) => (
          <div key={item.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="text-sm text-muted-foreground">{item.label}</div>
            <div className="mt-1 text-lg font-semibold">{questionText(item.value)}</div>
            {item.note ? <p className="mt-1 text-xs text-muted-foreground">{item.note}</p> : null}
            {item.available === false ? <p className="mt-1 text-xs text-muted-foreground">Bu ko'rsatkich yangi kuzatuvdan oldin yo'q.</p> : null}
          </div>
        ))}
      </div>
      {data?.diagnostics.length ? (
        <div className="space-y-2">
          {data.diagnostics.map((item) => (
            <p key={item.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
              {item.message}
            </p>
          ))}
        </div>
      ) : null}
      <Limitations items={data?.limitations} />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-heading text-2xl font-semibold tabular-nums">{value.toLocaleString("uz-UZ")}</div>
    </div>
  );
}
