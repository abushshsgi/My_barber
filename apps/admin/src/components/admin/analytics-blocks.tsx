import { useMemo, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { changeText, formatMetric } from "@/components/admin/RevenueAnalytics";
import type { AnalyticsKpi, FunnelStage, JourneyResponse } from "@/lib/revenue-analytics";
import { cn } from "@/lib/utils";

const STROKES = ["oklch(0.28 0.02 55)", "oklch(0.52 0.11 55)", "oklch(0.46 0.07 165)"];

export type MetricModel = {
  key: string;
  label: string;
  value: string;
  previous: string;
  change: string;
  direction: "up" | "down" | "flat";
  defined: boolean;
  series?: { date: string; value: number }[];
};

export function metricFromKpi(
  kpi: AnalyticsKpi,
  series?: { date: string; value: number }[],
): MetricModel {
  return {
    key: kpi.key,
    label: kpi.label,
    value:
      kpi.available === false || kpi.current == null ? "—" : formatMetric(kpi.current, kpi.unit),
    previous: kpi.previous == null ? "—" : formatMetric(kpi.previous, kpi.unit),
    change: changeText(kpi),
    direction: kpi.direction || "flat",
    defined:
      kpi.available !== false && kpi.change_state === "defined" && kpi.change_percent != null,
    series,
  };
}

export function seriesSignature(series: { date: string; value: number }[] | undefined) {
  if (!series?.length) return "";
  return series.map((point) => `${point.date}:${point.value}`).join("|");
}

export function ownedSeries(kpi: AnalyticsKpi, kpis: AnalyticsKpi[]) {
  const signature = seriesSignature(kpi.series);
  if (!signature || (kpi.series?.length ?? 0) < 2) return undefined;
  const owner = kpis.find((item) => seriesSignature(item.series) === signature);
  return owner?.key === kpi.key ? kpi.series : undefined;
}

export function distinctSeries(kpis: AnalyticsKpi[]) {
  const seen = new Set<string>();
  const rows: {
    key: string;
    label: string;
    unit?: string;
    points: { date: string; value: number }[];
  }[] = [];
  for (const kpi of kpis) {
    if (!kpi.series || kpi.series.length < 2) continue;
    const signature = seriesSignature(kpi.series);
    if (seen.has(signature)) continue;
    seen.add(signature);
    const label =
      kpi.unit === "uzs" || kpi.key === "confirmed_revenue"
        ? "Tasdiqlangan daromad"
        : kpi.key === "unique_visitors" || kpi.key === "new_visitors" || kpi.key === "sessions"
          ? "Kunlik noyob tashrif"
          : kpi.label;
    rows.push({ key: kpi.key, label, unit: kpi.unit, points: kpi.series });
  }
  return rows;
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-2xl border border-border bg-card", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3 className="font-heading text-sm font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </header>
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

function Delta({ metric }: { metric: Pick<MetricModel, "change" | "direction" | "defined"> }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        metric.defined && metric.direction === "up" && "text-success",
        metric.defined && metric.direction === "down" && "text-destructive",
        !metric.defined && "text-muted-foreground",
      )}
    >
      {metric.defined && metric.direction === "up" ? <ArrowUpRight className="size-3" /> : null}
      {metric.defined && metric.direction === "down" ? <ArrowDownRight className="size-3" /> : null}
      {!metric.defined || metric.direction === "flat" ? <Minus className="size-3" /> : null}
      {metric.change}
    </span>
  );
}

export function Sparkline({ series, up }: { series: { value: number }[]; up?: boolean }) {
  const width = 92;
  const height = 32;
  const values = series.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const d = values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-[92px]" aria-hidden>
      <path
        d={d}
        fill="none"
        stroke={up ? "var(--success)" : "currentColor"}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={up ? undefined : "text-foreground/80"}
      />
    </svg>
  );
}

export function MetricBand({ metrics }: { metrics: MetricModel[] }) {
  if (!metrics.length) return null;
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-border">
      <div className="grid grid-cols-1 gap-px sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.key} className="bg-card px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {metric.label}
              </p>
              {metric.series ? (
                <Sparkline
                  series={metric.series}
                  up={metric.defined && metric.direction === "up"}
                />
              ) : null}
            </div>
            <p
              key={metric.value}
              className="ax-tick mt-2 font-heading text-[1.65rem] font-semibold leading-none tracking-tight tabular-nums"
              aria-live="polite"
            >
              {metric.value}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Delta metric={metric} />
              <span className="text-xs text-muted-foreground">oldingi {metric.previous}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CompactMetrics({ metrics }: { metrics: MetricModel[] }) {
  if (!metrics.length) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <ul className="grid sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <li
            key={metric.key}
            className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 xl:[&:nth-last-child(-n+3)]:border-b-0"
          >
            <span className="text-sm text-muted-foreground">{metric.label}</span>
            <span className="flex items-center gap-3">
              <span className="font-medium tabular-nums">{metric.value}</span>
              <Delta metric={metric} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function compactTick(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(Math.round(value));
}

function dayLabel(date: string) {
  const parsed = new Date(`${date.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date.slice(5);
  return parsed.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
}

export function SeriesExplorer({
  kpis,
  title = "Vaqt bo'yicha",
  description = "Server qaytargan kunlik qatorlar. Bir xil qator bitta chiziqda.",
}: {
  kpis: AnalyticsKpi[];
  title?: string;
  description?: string;
}) {
  const options = useMemo(() => distinctSeries(kpis), [kpis]);
  const [hidden, setHidden] = useState<string[]>([]);
  const active = options.filter((item) => !hidden.includes(item.key));
  const mixed =
    active.some((item) => item.unit === "uzs") && active.some((item) => item.unit !== "uzs");
  const data = useMemo(() => {
    const dates = new Set<string>();
    for (const series of active)
      for (const point of series.points) dates.add(point.date.slice(0, 10));
    return [...dates].sort().map((date) => {
      const row: Record<string, string | number> = { date, label: dayLabel(date) };
      for (const series of active) {
        const hit = series.points.find((point) => point.date.slice(0, 10) === date);
        row[series.key] = hit?.value ?? 0;
      }
      return row;
    });
  }, [active]);
  const hasSignal = data.some((row) => active.some((series) => Number(row[series.key]) > 0));
  const config = Object.fromEntries(
    options.map((item, index) => [
      item.key,
      { label: item.label, color: STROKES[index % STROKES.length] },
    ]),
  );

  if (!options.length) return null;

  return (
    <Panel
      title={title}
      description={description}
      action={
        options.length > 1 ? (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Ko'rsatkichlar">
            {options.map((item, index) => {
              const on = !hidden.includes(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setHidden((current) => {
                      if (current.includes(item.key))
                        return current.filter((key) => key !== item.key);
                      if (options.length - current.length <= 1) return current;
                      return [...current, item.key];
                    })
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    on
                      ? "border-foreground/20 bg-card text-foreground"
                      : "border-transparent text-muted-foreground",
                  )}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ background: STROKES[index % STROKES.length] }}
                  />
                  {item.label}
                </button>
              );
            })}
          </div>
        ) : null
      }
    >
      {!hasSignal ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Bu davrda chiziq bo'sh.</p>
      ) : (
        <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
          <LineChart data={data} margin={{ top: 8, right: mixed ? 8 : 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              width={42}
              tickFormatter={compactTick}
              tick={{ fontSize: 11 }}
            />
            {mixed ? (
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                width={42}
                tickFormatter={compactTick}
                tick={{ fontSize: 11 }}
              />
            ) : null}
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const date = payload?.[0]?.payload?.date;
                    return typeof date === "string" ? dayLabel(date) : "";
                  }}
                  formatter={(value, name) => (
                    <div className="flex w-full min-w-[140px] items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {config[String(name)]?.label || name}
                      </span>
                      <span className="font-medium tabular-nums text-foreground">
                        {Number(value).toLocaleString("uz-UZ")}
                      </span>
                    </div>
                  )}
                />
              }
            />
            {active.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.key}
                yAxisId={mixed && series.unit === "uzs" ? "right" : "left"}
                stroke={`var(--color-${series.key})`}
                strokeWidth={1.75}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ChartContainer>
      )}
    </Panel>
  );
}

export function TrafficDays({
  days,
}: {
  days: {
    today: number;
    yesterday: number;
    days_ago_3: number;
    days_ago_7: number;
    days_ago_30: number;
    change: AnalyticsKpi;
  };
}) {
  const rows = [
    ["Bugun", days.today],
    ["Kecha", days.yesterday],
    ["3 kun oldin", days.days_ago_3],
    ["7 kun oldin", days.days_ago_7],
    ["30 kun oldin", days.days_ago_30],
  ] as const;
  const max = Math.max(1, ...rows.map(([, value]) => value));
  const change = metricFromKpi(days.change);
  return (
    <Panel title="Kunlik tashrif" description="Bugun kecha bilan bir xil soatgacha solishtiriladi.">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Delta metric={change} />
        <span className="text-xs text-muted-foreground">oldingi {change.previous}</span>
      </div>
      <ul className="space-y-3">
        {rows.map(([label, value]) => (
          <li key={label}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium tabular-nums">{value.toLocaleString("uz-UZ")}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground/80 transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${Math.max(value > 0 ? 4 : 0, (value / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function percentText(value: number | null | undefined) {
  if (value == null) return "—";
  return `${value}%`;
}

export function FunnelFlow({
  stages,
  selected,
  onSelect,
  windowDays,
}: {
  stages: FunnelStage[];
  selected: string | null;
  onSelect: (key: string) => void;
  windowDays?: number;
}) {
  const max = Math.max(1, ...stages.map((stage) => stage.unique_users));
  if (!stages.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Bu davrda voronka bo'sh.</p>
    );
  }
  return (
    <div>
      {windowDays ? (
        <p className="mb-3 text-xs text-muted-foreground">
          Qat'iy zanjir oynasi: {windowDays} kun. Bosqichni bosing.
        </p>
      ) : null}
      <ol className="flex flex-col gap-2 md:flex-row md:items-stretch md:gap-1.5 md:overflow-x-auto md:pb-2">
        {stages.map((stage, index) => {
          const width = Math.max(stage.unique_users > 0 ? 6 : 0, (stage.unique_users / max) * 100);
          const active = selected === stage.key;
          return (
            <li key={stage.key} className="md:w-[176px] md:shrink-0">
              <button
                type="button"
                onClick={() => onSelect(stage.key)}
                aria-pressed={active}
                className={cn(
                  "flex h-full w-full flex-col rounded-xl border px-3 py-3 text-left transition-colors",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card hover:border-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-[0.14em]",
                    active ? "text-background/60" : "text-muted-foreground",
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="mt-1 min-h-10 text-sm font-medium leading-snug">
                  {stage.label}
                </span>
                <span className="ax-tick mt-2 font-heading text-2xl font-semibold tabular-nums">
                  {stage.unique_users.toLocaleString("uz-UZ")}
                </span>
                <span
                  className={cn(
                    "text-[11px]",
                    active ? "text-background/70" : "text-muted-foreground",
                  )}
                >
                  noyob
                </span>
                <div
                  className={cn(
                    "mt-3 h-1.5 overflow-hidden rounded-full",
                    active ? "bg-background/20" : "bg-muted",
                  )}
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none",
                      active ? "bg-background" : "bg-foreground/80",
                    )}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <dl
                  className={cn(
                    "mt-3 space-y-1 text-[11px]",
                    active ? "text-background/80" : "text-muted-foreground",
                  )}
                >
                  <div className="flex justify-between gap-2">
                    <dt>Konversiya</dt>
                    <dd className="tabular-nums">
                      {percentText(stage.conversion_from_previous ?? stage.conversion_from_start)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Yo'qotish</dt>
                    <dd className="tabular-nums">{percentText(stage.drop_off_percent)}</dd>
                  </div>
                  <div
                    className="flex justify-between gap-2"
                    title="Oldingi davr bo'yicha bosqich farqi server javobida yo'q"
                  >
                    <dt>Davr</dt>
                    <dd>—</dd>
                  </div>
                </dl>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const PAYMENT_TONES: Record<string, string> = {
  successful: "bg-success",
  pending: "bg-warning",
  failed: "bg-destructive",
  cancelled: "bg-foreground/30",
  abandoned: "bg-[oklch(0.62_0.14_45)]",
  expired: "bg-foreground/15",
};

export function PaymentMix({ kpis }: { kpis: AnalyticsKpi[] }) {
  const order = ["successful", "pending", "failed", "cancelled", "abandoned", "expired"] as const;
  const rows = order
    .map((key) => kpis.find((kpi) => kpi.key === key))
    .filter((kpi): kpi is AnalyticsKpi => Boolean(kpi));
  const total = rows.reduce((sum, kpi) => sum + (kpi.current || 0), 0);
  return (
    <Panel
      title="To'lov holatlari"
      description="Muvaffaqiyat faqat serverdagi Payme tekshiruvidan. Tashlab ketilgan — hisoblangan natija."
    >
      <div
        className="flex h-3 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label="To'lov holatlari ulushi"
      >
        {total === 0
          ? null
          : rows.map((kpi) => (
              <div
                key={kpi.key}
                className={cn(
                  "h-full transition-[width] duration-500 motion-reduce:transition-none",
                  PAYMENT_TONES[kpi.key],
                )}
                style={{ width: `${((kpi.current || 0) / total) * 100}%` }}
                title={`${kpi.label}: ${kpi.current ?? 0}`}
              />
            ))}
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((kpi) => {
          const metric = metricFromKpi(kpi);
          return (
            <li
              key={kpi.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <span className={cn("size-2 shrink-0 rounded-full", PAYMENT_TONES[kpi.key])} />
                <span className="truncate">{kpi.label}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="font-medium tabular-nums">{metric.value}</span>
                <Delta metric={metric} />
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function PaymentBridge({
  attempts,
  redirected,
  successful,
  successRate,
  checkoutRate,
}: {
  attempts: number | null;
  redirected: number | null;
  successful: number | null;
  successRate: number | null;
  checkoutRate: number | null;
}) {
  const steps = [
    { label: "Urinish", value: attempts },
    { label: "Yo'naltirish", value: redirected },
    { label: "Tasdiq", value: successful },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {steps.map((step, index) => (
        <div key={step.label} className="rounded-xl border border-border px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {step.label}
          </div>
          <div className="mt-1 font-heading text-2xl font-semibold tabular-nums">
            {step.value == null ? "—" : step.value.toLocaleString("uz-UZ")}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {index === 1 ? `Tasdiq ulushi ${percentText(checkoutRate)}` : null}
            {index === 2 ? `Urinishdan ${percentText(successRate)}` : null}
            {index === 0 ? "Yaratilgan tranzaksiyalar" : null}
          </div>
        </div>
      ))}
    </div>
  );
}

const EVENT_LABELS: Record<string, string> = {
  page_view: "Sahifa",
  click: "Bosish",
  account_registered: "Ro'yxatdan o'tish",
  registration_completed: "Ro'yxat yakunlandi",
  registration_started: "Ro'yxat boshlandi",
  login_completed: "Kirish",
  premium_page_viewed: "Premium sahifa",
  premium_offer_viewed: "Taklif",
  subscription_plan_selected: "Tarif tanlandi",
  subscribe_clicked: "Obuna tugmasi",
  payment_initiated: "To'lov so'rovi",
  payment_transaction_created: "Tranzaksiya",
  checkout_redirect_attempted: "Checkoutga yo'naltirish",
  payme_return_viewed: "To'lov holati sahifasi",
  payment_confirmed: "To'lov tasdiqlandi",
  payment_failed: "To'lov muvaffaqiyatsiz",
  payment_cancelled: "To'lov bekor",
  payment_pending: "To'lov kutilmoqda",
  subscription_activated: "Obuna yoqildi",
  ai_tryon_opened: "AI try-on",
  ai_style_selected: "Uslub tanlandi",
  ai_generation_requested: "Generatsiya so'rovi",
  ai_generation_completed: "Generatsiya tayyor",
  ai_generation_failed: "Generatsiya xato",
};

const HIDDEN_PROP = /token|secret|password|card|pan|cvv|receipt|authorization|cookie|session_key/i;

export function formatStamp(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.replace("T", " ").slice(0, 16);
  return date.toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function eventTone(name: string, status: string) {
  const text = `${name} ${status}`.toLowerCase();
  if (text.includes("fail") || text.includes("abandon") || text.includes("cancel"))
    return "bg-destructive";
  if (
    text.includes("confirm") ||
    text.includes("paid") ||
    text.includes("activat") ||
    text.includes("completed")
  )
    return "bg-success";
  if (text.includes("premium") || text.includes("subscribe") || text.includes("payment"))
    return "bg-foreground";
  return "bg-foreground/25";
}

function visibleProps(properties: Record<string, unknown>) {
  return Object.entries(properties).flatMap(([key, value]) => {
    if (HIDDEN_PROP.test(key) || value == null || value === "" || typeof value === "object")
      return [];
    const label =
      key === "amount_uzs"
        ? "Summa"
        : key === "plan_code"
          ? "Tarif"
          : key === "provider"
            ? "Provayder"
            : key === "label"
              ? "Yorliq"
              : key === "auth_method"
                ? "Kirish"
                : key === "kind"
                  ? "Tur"
                  : key;
    const text =
      key === "amount_uzs" ? `${Number(value).toLocaleString("uz-UZ")} so'm` : String(value);
    return [[label, text] as const];
  });
}

export function JourneyTimeline({
  data,
  page,
  onPage,
}: {
  data: JourneyResponse;
  page: number;
  onPage: (page: number) => void;
}) {
  const facts = [
    ["Tashrif", String(data.visits)],
    ["Sessiya", String(data.sessions)],
    ["Premium", String(data.premium_page_views)],
    ["Obuna tugmasi", String(data.subscribe_clicks)],
    ["To'lov urinishi", String(data.payment_attempts)],
    ["Tasdiq", String(data.successful_payments)],
  ];
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading text-xl font-semibold tracking-tight">
          {data.label || "Foydalanuvchi"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.registered_at ? `Ro'yxat ${formatStamp(data.registered_at)}` : "Mehmon"}
          {data.auth_method ? ` · ${data.auth_method}` : ""}
          {` · ${data.source || "unknown"}`}
          {data.device ? ` · ${data.device}` : ""}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label} className="bg-card px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {label}
            </div>
            <div className="mt-0.5 font-medium tabular-nums">{value}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>Birinchi {formatStamp(data.first_visit)}</span>
        <span>Oxirgi {formatStamp(data.last_visit)}</span>
        <span>
          Obuna:{" "}
          {data.subscription
            ? `${data.subscription.plan_code} · ${data.subscription.status}`
            : "Yo'q"}
        </span>
        <span>Tasdiqlangan xarajat {data.confirmed_spend_uzs.toLocaleString("uz-UZ")} so'm</span>
      </div>
      {data.events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Bu sahifada harakat yo'q.
        </p>
      ) : (
        <ol className="relative space-y-0 border-l border-border pl-4">
          {data.events.map((event, index) => {
            const props = visibleProps(event.properties || {});
            return (
              <li key={`${event.at}-${event.name}-${index}`} className="relative pb-4">
                <span
                  className={cn(
                    "absolute -left-[21px] top-1.5 size-2.5 rounded-full",
                    eventTone(event.name, event.status),
                  )}
                />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{EVENT_LABELS[event.name] || event.name}</p>
                  <time className="text-xs text-muted-foreground" dateTime={event.at}>
                    {formatStamp(event.at)}
                  </time>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {event.page || "—"}
                  {event.status ? ` · ${event.status}` : ""}
                  {event.session ? ` · ${event.session.slice(0, 8)}` : ""}
                </p>
                {props.length ? (
                  <p className="mt-1 text-xs text-foreground/80">
                    {props.map(([label, value]) => `${label}: ${value}`).join(" · ")}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
      <Pager page={page} onPage={onPage} hasPrev={page > 1} hasNext={page * 25 < data.count} />
    </div>
  );
}

export function Pager({
  page,
  onPage,
  hasPrev,
  hasNext,
}: {
  page: number;
  onPage: (page: number) => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <button
        type="button"
        disabled={!hasPrev}
        onClick={() => onPage(page - 1)}
        className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
      >
        Oldingi
      </button>
      <span className="tabular-nums text-muted-foreground">{page}</span>
      <button
        type="button"
        disabled={!hasNext}
        onClick={() => onPage(page + 1)}
        className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
      >
        Keyingi
      </button>
    </div>
  );
}

export function statusTone(status: string) {
  if (status === "paid") return "bg-success/15 text-success";
  if (status === "pending") return "bg-warning/20 text-foreground";
  if (status === "failed") return "bg-destructive/10 text-destructive";
  if (status === "cancelled" || status === "expired") return "bg-muted text-muted-foreground";
  if (status === "refunded") return "bg-info/15 text-info";
  return "bg-muted text-muted-foreground";
}
