import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StatsPageHeader } from "@/components/admin/StatisticsShell";
import { fetchAnalyticsRealtime, type RealtimeResponse } from "@/lib/revenue-analytics";

export const Route = createFileRoute("/admin/analytics/realtime")({
  component: RealtimePage,
});

function RealtimePage() {
  const query = useQuery({
    queryKey: ["analytics", "realtime"],
    queryFn: fetchAnalyticsRealtime,
    refetchInterval: 15_000,
  });
  const data = query.data;
  return (
    <div className="space-y-6">
      <StatsPageHeader title="Real vaqt" description="Har 15 soniyada yangilanadi. Faollik oynasi 5 va 15 daqiqa." />
      {data ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Tile label="So'nggi 5 daqiqa" value={data.active_5_minutes} />
            <Tile label="So'nggi 15 daqiqa" value={data.active_15_minutes} />
            <Tile label="Faol sessiyalar" value={data.active_sessions} />
          </div>
          <p className="text-sm text-muted-foreground">{data.note}</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <Feed title="Ro'yxatdan o'tish" rows={data.recent_registrations} />
            <Feed title="Premium" rows={data.recent_premium_views} />
            <Feed title="Obuna tugmasi" rows={data.recent_subscribe_clicks} />
            <Feed title="To'lov urinishi" rows={data.recent_payment_attempts} />
            <Feed title="Tasdiqlangan to'lov" rows={data.recent_confirmed_payments} />
            <Feed title="AI" rows={data.recent_ai} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums">{value.toLocaleString("uz-UZ")}</div>
    </div>
  );
}

function Feed({ title, rows }: { title: string; rows: RealtimeResponse["recent_ai"] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <h2 className="font-medium">{title}</h2>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {rows.length === 0 ? <li>Hozircha yo'q</li> : null}
        {rows.map((row, index) => (
          <li key={`${row.at}-${index}`}>
            {row.name} · {row.at.slice(11, 16)}
          </li>
        ))}
      </ul>
    </section>
  );
}
