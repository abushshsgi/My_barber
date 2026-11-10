import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { StatsPageHeader } from "@/components/admin/StatisticsShell";
import { PeriodBar, UserLink, useAnalyticsPeriod } from "@/components/admin/RevenueAnalytics";
import { analyticsQuery, fetchAnalyticsUsers } from "@/lib/revenue-analytics";
import { cn } from "@/lib/utils";

const FILTERS = [
  ["all", "Hammasi"],
  ["registered", "Ro'yxatdan o'tgan"],
  ["anonymous", "Anonim"],
  ["premium_viewers", "Premium"],
  ["subscribe_clickers", "Obuna tugmasi"],
  ["payment_starters", "To'lov boshlagan"],
  ["payment_abandoners", "Tashlab ketgan"],
  ["paying_subscribers", "To'lagan"],
  ["ai_tryon", "AI try-on"],
  ["shampoo_scanner", "Shampun skaner"],
] as const;

export const Route = createFileRoute("/admin/analytics/users")({
  component: UsersPage,
});

function UsersPage() {
  const period = useAnalyticsPeriod();
  const [kind, setKind] = useState("all");
  const [page, setPage] = useState(1);
  const queryText = analyticsQuery(period.preset, period.start, period.end, { kind, page: String(page) });
  const query = useQuery({
    queryKey: ["analytics", "users", queryText],
    queryFn: () => fetchAnalyticsUsers(queryText),
  });
  return (
    <div className="space-y-6">
      <StatsPageHeader title="Foydalanuvchi harakatlari" description="Ro'yxat serverda sahifalanadi. Odamni ochsangiz, uning yo'li chiqadi." />
      <PeriodBar
        preset={period.preset}
        start={period.start}
        end={period.end}
        onPreset={(value) => {
          setPage(1);
          period.setPreset(value);
        }}
        onStart={period.setStart}
        onEnd={period.setEnd}
      />
      <div className="flex flex-wrap gap-1">
        {FILTERS.map(([value, label]) => (
          <button key={value} type="button" onClick={() => { setKind(value); setPage(1); }} className={cn("rounded-lg px-3 py-1.5 text-sm", kind === value ? "bg-foreground text-background" : "bg-muted text-muted-foreground")}>
            {label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              {["Odam", "Manba", "Qurilma", "Tashrif", "Oxirgi"].map((label) => (
                <th key={label} className="px-3 py-3 font-medium">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(query.data?.results ?? []).map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-3 py-3"><UserLink id={row.id} label={row.label} /></td>
                <td className="px-3 py-3">{row.source || "unknown"}</td>
                <td className="px-3 py-3">{row.device}</td>
                <td className="px-3 py-3">{row.visits}</td>
                <td className="px-3 py-3">{row.last_seen?.slice(0, 16).replace("T", " ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">Oldingi</button>
        <span>{page}</span>
        <button type="button" disabled={(query.data?.results.length ?? 0) < 25} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">Keyingi</button>
      </div>
    </div>
  );
}
