import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import {
  CompactMetrics,
  FunnelFlow,
  MetricBand,
  Panel,
  SeriesExplorer,
  TrafficDays,
  metricFromKpi,
  ownedSeries,
  type MetricModel,
} from "@/components/admin/analytics-blocks";
import {
  fetchAnalyticsFunnel,
  fetchAnalyticsOverview,
  type OverviewResponse,
} from "@/lib/revenue-analytics";

export const Route = createFileRoute("/admin/analytics/")({
  component: OverviewPage,
});

const HIGHLIGHT = ["unique_visitors", "registrations", "successful_payments", "confirmed_revenue"];

function OverviewPage() {
  const period = useAnalyticsPeriod();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["analytics", "overview", period.query],
    queryFn: () => fetchAnalyticsOverview(period.query),
    placeholderData: keepPreviousData,
  });
  const funnel = useQuery({
    queryKey: ["analytics", "funnel", period.query, "user"],
    queryFn: () => fetchAnalyticsFunnel(`${period.query}${period.query ? "&" : "?"}funnel=user`),
    placeholderData: keepPreviousData,
  });
  const data = query.data;

  if (query.isPending && !data) return <AnalyticsSkeleton />;
  if (query.isError)
    return <AnalyticsError message={errorText(query.error)} onRetry={() => void query.refetch()} />;
  if (!data) return <AnalyticsEmpty title="Analitika bo'sh" />;

  const highlight = highlightMetrics(data);
  const rest = data.kpis
    .filter((kpi) => !HIGHLIGHT.includes(kpi.key))
    .map((kpi) => metricFromKpi(kpi, ownedSeries(kpi, data.kpis)));
  const drop = data.questions.find((item) => item.id === "dropoff");

  return (
    <div
      className={query.isPlaceholderData ? "space-y-5 opacity-80 transition-opacity" : "space-y-5"}
    >
      <FetchBar active={query.isFetching || funnel.isFetching} />
      <SectionIntro
        title="Umumiy"
        description={
          data.period?.label
            ? `${data.period.label}. Taqqoslash: ${data.period.previous_label}.`
            : undefined
        }
      />
      <MetricBand metrics={highlight} />
      <CompactMetrics metrics={rest} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <SeriesExplorer
          kpis={data.kpis}
          title="Tashrif va daromad"
          description="Chap o'q tashrif, o'ng o'q so'm. Ro'yxat alohida kunlik qator qaytarmaydi."
        />
        <TrafficDays days={data.traffic_days} />
      </div>
      <Panel
        title="Sotuv voronkasi"
        description="Tashrifdan tasdiqlangan to'lovgacha. To'liq tafsilot voronka sahifasida."
        action={
          <button
            type="button"
            onClick={() => void navigate({ to: "/admin/analytics/funnel" })}
            className="text-sm text-foreground underline-offset-4 hover:underline"
          >
            Ochish
          </button>
        }
        bodyClassName="px-3 sm:px-4"
      >
        {drop ? (
          <p className="mb-3 text-sm text-muted-foreground">
            Eng katta yo'qotish: {questionText(drop.value)}
          </p>
        ) : null}
        {funnel.isError ? (
          <p className="text-sm text-destructive">Voronka yuklanmadi.</p>
        ) : (
          <FunnelFlow
            stages={funnel.data?.stages ?? []}
            selected={null}
            onSelect={() => void navigate({ to: "/admin/analytics/funnel" })}
            windowDays={funnel.data?.window_days}
          />
        )}
      </Panel>
      {data.diagnostics.length ? (
        <div className="space-y-2">
          {data.diagnostics.map((item) => (
            <p
              key={item.id}
              className="rounded-xl border border-warning/40 bg-card px-4 py-3 text-sm"
            >
              {item.message}
            </p>
          ))}
        </div>
      ) : null}
      <Panel title="Savollar" bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {data.questions.map((item) => (
            <li
              key={item.id}
              className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(180px,280px)_minmax(0,1fr)] sm:gap-4 sm:px-5"
            >
              <div className="text-sm text-muted-foreground">{item.label}</div>
              <div className="min-w-0 text-sm">
                <QuestionValue value={item.value} />
                {item.note ? (
                  <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
                ) : null}
                {item.available === false ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Bu ko'rsatkich yangi kuzatuvdan oldin yo'q.
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
      <Limitations items={data.limitations} />
    </div>
  );
}

function highlightMetrics(data: OverviewResponse): MetricModel[] {
  const byKey = new Map(data.kpis.map((kpi) => [kpi.key, kpi]));
  const metrics: MetricModel[] = [];
  for (const key of ["unique_visitors", "registrations"] as const) {
    const kpi = byKey.get(key);
    if (kpi) metrics.push(metricFromKpi(kpi, ownedSeries(kpi, data.kpis)));
  }
  metrics.push(premiumMetric(data));
  for (const key of ["successful_payments", "confirmed_revenue"] as const) {
    const kpi = byKey.get(key);
    if (kpi) metrics.push(metricFromKpi(kpi, ownedSeries(kpi, data.kpis)));
  }
  metrics.push(conversionMetric(data));
  return metrics;
}

function premiumMetric(data: OverviewResponse): MetricModel {
  const question = data.questions.find((item) => item.id === "premium_views");
  const pair = asPair(question?.value);
  const available = question?.available !== false;
  return {
    key: "premium_views",
    label: "Premium sahifa",
    value: !available
      ? "—"
      : pair
        ? (pair.users ?? 0).toLocaleString("uz-UZ")
        : questionText(question?.value),
    previous: "—",
    change: available ? "Taqqoslash yo'q" : "Kuzatuv yo'q",
    direction: "flat",
    defined: false,
  };
}

function conversionMetric(data: OverviewResponse): MetricModel {
  const visitors = data.kpis.find((kpi) => kpi.key === "unique_visitors");
  const registrations = data.kpis.find((kpi) => kpi.key === "registrations");
  const current =
    data.visitors?.registration_conversion ??
    rate(registrations?.current ?? null, visitors?.current ?? null);
  const previous = rate(registrations?.previous ?? null, visitors?.previous ?? null);
  if (current == null) {
    return {
      key: "registration_conversion",
      label: "Ro'yxat konversiyasi",
      value: "—",
      previous: "—",
      change: "Kuzatuv yo'q",
      direction: "flat",
      defined: false,
    };
  }
  if (previous == null || previous === 0) {
    return {
      key: "registration_conversion",
      label: "Ro'yxat konversiyasi",
      value: `${current}%`,
      previous: previous == null ? "—" : `${previous}%`,
      change: "Taqqoslab bo'lmaydi",
      direction: "flat",
      defined: false,
    };
  }
  const delta = Math.round(((current - previous) / previous) * 1000) / 10;
  return {
    key: "registration_conversion",
    label: "Ro'yxat konversiyasi",
    value: `${current}%`,
    previous: `${previous}%`,
    change: `${delta > 0 ? "+" : ""}${delta}%`,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    defined: true,
  };
}

function rate(part: number | null, whole: number | null) {
  if (part == null || whole == null || whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

function asPair(value: unknown) {
  if (!value || typeof value !== "object" || !("users" in value)) return null;
  return value as { users?: number; events?: number };
}

function questionText(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number") return value.toLocaleString("uz-UZ");
  if (typeof value === "string") return value;
  if (typeof value === "object" && "change_percent" in value) {
    const row = value as { change_percent: number | null; change_state: string };
    if (row.change_state !== "defined" || row.change_percent == null) return "Taqqoslab bo'lmaydi";
    return `${row.change_percent > 0 ? "+" : ""}${row.change_percent}%`;
  }
  if (typeof value === "object" && "drop_off" in value) {
    const row = value as { label?: string; drop_off?: number; drop_off_percent?: number | null };
    return `${row.label || "—"}: ${row.drop_off ?? 0} (${row.drop_off_percent ?? "—"}%)`;
  }
  if (typeof value === "object" && "users" in value) {
    const row = value as { users?: number; events?: number };
    return `${row.users ?? 0} kishi, ${row.events ?? 0} voqea`;
  }
  if (Array.isArray(value)) return value.length ? `${value.length} ta qator` : "Hali yo'q";
  return "—";
}

function QuestionValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    if (!value.length) return <span>Hali yo'q</span>;
    return (
      <ul className="space-y-1">
        {value.slice(0, 8).map((row, index) => (
          <li key={index} className="truncate">
            {rowLabel(row)}
          </li>
        ))}
      </ul>
    );
  }
  return <span className="font-medium">{questionText(value)}</span>;
}

function rowLabel(row: unknown) {
  if (!row || typeof row !== "object") return "—";
  const record = row as Record<string, unknown>;
  if ("source" in record) {
    return `${String(record.source)} · sotuv ${String(record.purchases ?? 0)} · ${Number(record.revenue_uzs || 0).toLocaleString("uz-UZ")} so'm`;
  }
  if ("name" in record) {
    return `${String(record.name)} · ${String(record.events ?? 0)} voqea · ${String(record.users ?? 0)} kishi`;
  }
  return questionText(row);
}
