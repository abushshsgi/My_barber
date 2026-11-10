import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { analyticsQuery } from "@/lib/revenue-analytics";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import type { AnalyticsKpi } from "@/lib/revenue-analytics";
import { ANALYTICS_PRESETS } from "@/lib/revenue-analytics";
import { cn } from "@/lib/utils";

export function useAnalyticsPeriod() {
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
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
        {ANALYTICS_PRESETS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onPreset(value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition-colors",
              preset === value ? "bg-background font-medium shadow-card" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {preset === "custom" ? (
        <div className="flex gap-2">
          <input type="date" value={start} onChange={(event) => onStart(event.target.value)} className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm" />
          <input type="date" value={end} onChange={(event) => onEnd(event.target.value)} className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm" />
        </div>
      ) : null}
    </div>
  );
}

export function changeText(kpi: Pick<AnalyticsKpi, "change_percent" | "change_state" | "available">): string {
  if (kpi.available === false || kpi.change_state === "unavailable") return "Kuzatuv yo'q";
  if (kpi.change_state === "undefined" || kpi.change_percent == null) return "Taqqoslab bo'lmaydi";
  return `${kpi.change_percent > 0 ? "+" : ""}${kpi.change_percent}%`;
}

export function AnalyticsKpiCard({ kpi }: { kpi: AnalyticsKpi }) {
  const trend = kpi.direction || "flat";
  const value = kpi.available === false || kpi.current == null ? "—" : formatMetric(kpi.current, kpi.unit);
  return (
    <div className="flex min-h-[148px] flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="text-sm font-medium text-muted-foreground">{kpi.label}</div>
      <div className="mt-3 font-heading text-3xl font-semibold tabular-nums">{value}</div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium",
            trend === "up" && kpi.change_state === "defined" && "bg-success/10 text-success",
            trend === "down" && kpi.change_state === "defined" && "bg-destructive/10 text-destructive",
            kpi.change_state !== "defined" && "bg-muted text-muted-foreground",
          )}
        >
          {trend === "up" && kpi.change_state === "defined" ? <ArrowUpRight className="size-3" /> : null}
          {trend === "down" && kpi.change_state === "defined" ? <ArrowDownRight className="size-3" /> : null}
          {kpi.change_state !== "defined" || trend === "flat" ? <Minus className="size-3" /> : null}
          {changeText(kpi)}
        </span>
        {kpi.series && kpi.series.length > 1 ? (
          <div className="h-8 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kpi.series}>
                <Line type="monotone" dataKey="value" stroke="currentColor" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function formatMetric(value: number, unit?: string): string {
  const formatted = value.toLocaleString("uz-UZ");
  if (unit === "uzs") return `${formatted} so'm`;
  return formatted;
}

export function Limitations({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-1 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function UserLink({ id, label }: { id: string; label: string }) {
  return (
    <Link to="/admin/analytics/users/$userId" params={{ userId: id }} className="font-medium underline-offset-4 hover:underline">
      {label || id}
    </Link>
  );
}
