import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { StatsPageHeader } from "@/components/admin/StatisticsShell";
import { Limitations, PeriodBar, UserLink, useAnalyticsPeriod } from "@/components/admin/RevenueAnalytics";
import { analyticsQuery, fetchAnalyticsFunnel, fetchAnalyticsStage } from "@/lib/revenue-analytics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/analytics/funnel")({
  component: FunnelPage,
});

function FunnelPage() {
  const period = useAnalyticsPeriod();
  const [mode, setMode] = useState<"user" | "session">("user");
  const [stage, setStage] = useState<string | null>(null);
  const queryText = analyticsQuery(period.preset, period.start, period.end, { funnel: mode });
  const funnel = useQuery({
    queryKey: ["analytics", "funnel", queryText],
    queryFn: () => fetchAnalyticsFunnel(queryText),
  });
  const drill = useQuery({
    queryKey: ["analytics", "stage", queryText, stage],
    queryFn: () => fetchAnalyticsStage(`${queryText}&stage=${stage}`),
    enabled: Boolean(stage),
  });
  const max = Math.max(1, ...(funnel.data?.stages ?? []).map((row) => row.unique_users));
  return (
    <div className="space-y-6">
      <StatsPageHeader title="Sotuv voronkasi" description="Qat'iy tartib va alohida voqea sonlari. Bosqichni bosing." />
      <PeriodBar preset={period.preset} start={period.start} end={period.end} onPreset={period.setPreset} onStart={period.setStart} onEnd={period.setEnd} />
      <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
        {(["user", "session"] as const).map((value) => (
          <button key={value} type="button" onClick={() => setMode(value)} className={cn("rounded-md px-3 py-1.5 text-sm", mode === value && "bg-background font-medium shadow-card")}>
            {value === "user" ? "Foydalanuvchi" : "Sessiya"}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {(funnel.data?.stages ?? []).map((row) => (
          <button key={row.key} type="button" onClick={() => setStage(row.key)} className="block w-full rounded-2xl border border-border bg-card p-4 text-left shadow-card">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{row.label}</span>
              <span className="text-sm text-muted-foreground">
                {row.unique_users.toLocaleString("uz-UZ")} kishi · {row.events.toLocaleString("uz-UZ")} voqea · {row.unique_sessions.toLocaleString("uz-UZ")} sessiya
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground/80 transition-all" style={{ width: `${Math.max(4, (row.unique_users / max) * 100)}%` }} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Oldingisidan: {row.conversion_from_previous ?? "—"}% · Boshidan: {row.conversion_from_start ?? "—"}% · Yo'qotish: {row.drop_off ?? "—"} ({row.drop_off_percent ?? "—"}%) · Keyingisigacha: {row.avg_seconds_to_next ?? "—"} s
              {row.tracking === "unavailable" ? " · Bu bosqich yangi kuzatuvdan oldin yo'q." : ""}
            </div>
          </button>
        ))}
      </div>
      {stage && drill.data ? (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <h2 className="font-heading text-lg font-semibold">{drill.data.stage.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Qat'iy voronkada {drill.data.count} ta. Alohida foydalanuvchilar: {drill.data.stage.standalone_users}. Voqealar: {drill.data.stage.events}.
          </p>
          <ul className="mt-3 divide-y divide-border">
            {drill.data.results.map((person) => (
              <li key={person.id} className="py-2">
                <UserLink id={person.id} label={person.label} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Limitations items={funnel.data?.limitations} />
    </div>
  );
}
