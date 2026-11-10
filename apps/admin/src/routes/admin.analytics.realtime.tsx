import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AnalyticsError,
  AnalyticsSkeleton,
  SectionIntro,
  errorText,
} from "@/components/admin/analytics-shell";
import { formatStamp } from "@/components/admin/analytics-blocks";
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
  if (query.isPending && !data) return <AnalyticsSkeleton rows={2} />;
  if (query.isError)
    return <AnalyticsError message={errorText(query.error)} onRetry={() => void query.refetch()} />;
  if (!data) return null;
  return (
    <div className="space-y-5">
      <SectionIntro
        title="Jonli"
        description="Har 15 soniyada yangilanadi. Faollik oynasi 5 va 15 daqiqa."
      />
      <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
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
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-2 font-heading text-3xl font-semibold tabular-nums">
        {value.toLocaleString("uz-UZ")}
      </div>
    </div>
  );
}

function Feed({
  title,
  rows,
}: {
  title: string;
  rows: Array<RealtimeResponse["recent_ai"][number] & { status?: string; amount_uzs?: number }>;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <h3 className="border-b border-border px-4 py-3 font-heading text-sm font-semibold">
        {title}
      </h3>
      <ul>
        {rows.length === 0 ? (
          <li className="px-4 py-4 text-sm text-muted-foreground">Hozircha yo'q</li>
        ) : null}
        {rows.map((row, index) => (
          <li
            key={`${row.at}-${index}`}
            className="flex items-baseline justify-between gap-3 border-t border-border px-4 py-2.5 text-sm first:border-t-0"
          >
            <span className="min-w-0 truncate">
              {row.name || "—"}
              {row.status ? <span className="text-muted-foreground"> · {row.status}</span> : null}
              {row.amount_uzs != null ? (
                <span className="text-muted-foreground">
                  {" "}
                  · {row.amount_uzs.toLocaleString("uz-UZ")} so'm
                </span>
              ) : null}
            </span>
            <time className="shrink-0 text-xs text-muted-foreground" dateTime={row.at}>
              {formatStamp(row.at)}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}
