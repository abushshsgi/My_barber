import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Limitations, UserLink, useAnalyticsPeriod } from "@/components/admin/RevenueAnalytics";
import {
  AnalyticsError,
  AnalyticsSkeleton,
  FetchBar,
  SectionIntro,
  errorText,
} from "@/components/admin/analytics-shell";
import { FunnelFlow, Pager, Panel } from "@/components/admin/analytics-blocks";
import { analyticsQuery, fetchAnalyticsFunnel, fetchAnalyticsStage } from "@/lib/revenue-analytics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/analytics/funnel")({
  component: FunnelPage,
});

function FunnelPage() {
  const period = useAnalyticsPeriod();
  const [mode, setMode] = useState<"user" | "session">("user");
  const [stage, setStage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const queryText = analyticsQuery(period.preset, period.start, period.end, { funnel: mode });
  const funnel = useQuery({
    queryKey: ["analytics", "funnel", queryText],
    queryFn: () => fetchAnalyticsFunnel(queryText),
    placeholderData: keepPreviousData,
  });
  const drill = useQuery({
    queryKey: ["analytics", "stage", queryText, stage, page],
    queryFn: () => fetchAnalyticsStage(`${queryText}&stage=${stage}&page=${page}`),
    enabled: Boolean(stage),
  });
  const data = funnel.data;

  if (funnel.isPending && !data) return <AnalyticsSkeleton rows={2} />;
  if (funnel.isError)
    return (
      <AnalyticsError message={errorText(funnel.error)} onRetry={() => void funnel.refetch()} />
    );
  if (!data) return null;

  const selected = data.stages.find((row) => row.key === stage) ?? null;

  return (
    <div
      className={funnel.isPlaceholderData ? "space-y-5 opacity-80 transition-opacity" : "space-y-5"}
    >
      <FetchBar active={funnel.isFetching || drill.isFetching} />
      <SectionIntro
        title="Sotuv voronkasi"
        description="Tashrif, ro'yxat, Premium, obuna, Payme va tasdiq. Bosqich faqat oldingisidan keyin hisoblanadi."
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-border bg-card p-1">
          {(["user", "session"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setStage(null);
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors",
                mode === value ? "bg-foreground text-background" : "text-muted-foreground",
              )}
            >
              {value === "user" ? "Foydalanuvchi" : "Sessiya"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Davr farqi bosqich kesimida server javobida yo'q.
        </p>
      </div>
      <Panel title="Oqim" bodyClassName="px-3 sm:px-4">
        <FunnelFlow
          stages={data.stages}
          selected={stage}
          windowDays={data.window_days}
          onSelect={(key) => {
            setStage(key);
            setPage(1);
          }}
        />
      </Panel>
      {stage && selected ? (
        <Panel
          title={drill.data?.stage.label || selected.label}
          description={`${selected.unique_users.toLocaleString("uz-UZ")} noyob · ${selected.events.toLocaleString("uz-UZ")} voqea · ${selected.unique_sessions.toLocaleString("uz-UZ")} sessiya`}
        >
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Oldingi bosqichdan" value={pct(selected.conversion_from_previous)} />
            <Fact label="Boshidan" value={pct(selected.conversion_from_start)} />
            <Fact
              label="Yo'qotish"
              value={
                selected.drop_off == null
                  ? "—"
                  : `${selected.drop_off.toLocaleString("uz-UZ")} (${pct(selected.drop_off_percent)})`
              }
            />
            <Fact
              label="Keyingisigacha"
              value={
                selected.avg_seconds_to_next == null ? "—" : `${selected.avg_seconds_to_next} s`
              }
            />
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Alohida foydalanuvchilar: {selected.standalone_users.toLocaleString("uz-UZ")}. Qat'iy
            voronkada {drill.data ? drill.data.count.toLocaleString("uz-UZ") : "…"}.
            {selected.tracking === "unavailable" ? " Bu bosqich yangi kuzatuvdan oldin yo'q." : ""}
            {selected.tracking === "partial" ? " Kuzatuv qisman." : ""}
            {selected.tracking === "reconstructed" ? " Qisman eski yozuvlardan tiklangan." : ""}
          </p>
          {drill.isError ? (
            <p className="mt-3 text-sm text-destructive">{errorText(drill.error)}</p>
          ) : null}
          {drill.isPending ? (
            <p className="mt-3 text-sm text-muted-foreground">Odamlar yuklanmoqda…</p>
          ) : null}
          {drill.data ? (
            <ul className="mt-4 divide-y divide-border">
              {drill.data.results.length === 0 ? (
                <li className="py-3 text-sm text-muted-foreground">Bu sahifada odam yo'q.</li>
              ) : null}
              {drill.data.results.map((person) => (
                <li key={person.id} className="py-2.5">
                  <UserLink id={person.id} label={person.label} />
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4">
            <Pager
              page={page}
              onPage={setPage}
              hasPrev={page > 1}
              hasNext={page * 25 < (drill.data?.count ?? 0)}
            />
          </div>
        </Panel>
      ) : (
        <p className="text-sm text-muted-foreground">
          Bosqichni tanlang — odamlar va vaqt shu yerda ochiladi.
        </p>
      )}
      <Limitations items={data.limitations} />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}

function pct(value: number | null) {
  return value == null ? "—" : `${value}%`;
}
