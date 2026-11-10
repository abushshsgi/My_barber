import { Link } from "@tanstack/react-router";
import { createContext, useContext, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { analyticsQuery, ANALYTICS_PRESETS } from "@/lib/revenue-analytics";
import type { AnalyticsKpi } from "@/lib/revenue-analytics";
import { cn } from "@/lib/utils";

export type AnalyticsPeriodState = {
  preset: string;
  setPreset: (value: string) => void;
  start: string;
  setStart: (value: string) => void;
  end: string;
  setEnd: (value: string) => void;
  query: string;
};

const PeriodContext = createContext<AnalyticsPeriodState | null>(null);

function usePeriodState(): AnalyticsPeriodState {
  const [preset, setPreset] = useState("last_7_days");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  return {
    preset,
    setPreset,
    start,
    setStart,
    end,
    setEnd,
    query: analyticsQuery(preset, start, end),
  };
}

export function AnalyticsPeriodProvider({ children }: { children: ReactNode }) {
  const value = usePeriodState();
  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function useAnalyticsPeriod() {
  const shared = useContext(PeriodContext);
  const local = usePeriodState();
  return shared ?? local;
}

export function comparisonCaption(preset: string) {
  if (preset === "today") return "Kecha, shu vaqtgacha";
  if (preset === "yesterday" || preset === "days_ago_3" || preset === "days_ago_7") {
    return "Undan oldingi kun";
  }
  return "Oldingi teng oralig'";
}

export function PeriodBar({
  preset,
  start,
  end,
  onPreset,
  onStart,
  onEnd,
}: {
  preset: string;
  start: string;
  end: string;
  onPreset: (value: string) => void;
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
        {ANALYTICS_PRESETS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onPreset(value)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors",
              preset === value
                ? "bg-foreground font-medium text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {preset === "custom" ? (
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={start}
            onChange={(event) => onStart(event.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
            aria-label="Boshlanish"
          />
          <input
            type="date"
            value={end}
            onChange={(event) => onEnd(event.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
            aria-label="Tugash"
          />
        </div>
      ) : null}
    </div>
  );
}

export function changeText(
  kpi: Pick<AnalyticsKpi, "change_percent" | "change_state" | "available">,
): string {
  if (kpi.available === false || kpi.change_state === "unavailable") return "Kuzatuv yo'q";
  if (kpi.change_state === "undefined" || kpi.change_percent == null) return "Taqqoslab bo'lmaydi";
  return `${kpi.change_percent > 0 ? "+" : ""}${kpi.change_percent}%`;
}

export function formatMetric(value: number, unit?: string): string {
  const formatted = value.toLocaleString("uz-UZ");
  if (unit === "uzs") return `${formatted} so'm`;
  return formatted;
}

export function AnalyticsKpiCard({ kpi }: { kpi: AnalyticsKpi }) {
  const trend = kpi.direction || "flat";
  const defined = kpi.change_state === "defined";
  const value =
    kpi.available === false || kpi.current == null ? "—" : formatMetric(kpi.current, kpi.unit);
  return (
    <article className="flex min-h-[132px] flex-col justify-between rounded-2xl border border-border bg-card px-4 py-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {kpi.label}
      </div>
      <div
        key={value}
        className="ax-tick mt-2 font-heading text-[1.7rem] font-semibold leading-none tracking-tight tabular-nums"
      >
        {value}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 font-medium",
            defined && trend === "up" && "text-success",
            defined && trend === "down" && "text-destructive",
            !defined && "text-muted-foreground",
          )}
        >
          {defined && trend === "up" ? <ArrowUpRight className="size-3" /> : null}
          {defined && trend === "down" ? <ArrowDownRight className="size-3" /> : null}
          {!defined || trend === "flat" ? <Minus className="size-3" /> : null}
          {changeText(kpi)}
        </span>
        <span className="text-muted-foreground">
          oldingi {kpi.previous == null ? "—" : formatMetric(kpi.previous, kpi.unit)}
        </span>
      </div>
    </article>
  );
}

export function Limitations({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <aside className="rounded-2xl border border-dashed border-border px-4 py-3 text-xs leading-relaxed text-muted-foreground">
      <div className="mb-1 font-medium uppercase tracking-[0.14em] text-foreground/70">
        Cheklovlar
      </div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </aside>
  );
}

export function UserLink({ id, label }: { id: string; label: string }) {
  return (
    <Link
      to="/admin/analytics/users/$userId"
      params={{ userId: id }}
      className="font-medium text-foreground underline-offset-4 hover:underline"
    >
      {label || id}
    </Link>
  );
}
