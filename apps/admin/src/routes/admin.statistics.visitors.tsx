import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Eye, MousePointerClick, Radio, Users } from "lucide-react";
import { fetchAdminSiteVisitors } from "@/lib/admin-api";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatsPageHeader } from "@/components/admin/StatisticsShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/statistics/visitors")({
  component: StatisticsVisitorsPage,
});

function formatWhen(value: string | null): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd.MM.yyyy HH:mm");
  } catch {
    return value;
  }
}

function StatisticsVisitorsPage() {
  const [days, setDays] = useState(30);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const q = useQuery({
    queryKey: ["admin", "site-visitors", days, selectedId],
    queryFn: () => fetchAdminSiteVisitors(days, selectedId ?? undefined),
    refetchInterval: 15_000,
  });

  const summary = q.data?.summary;
  const daily = q.data?.daily ?? [];
  const maxBar = Math.max(1, ...daily.map((row) => row.pageviews + row.clicks));

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Tashrif buyuruvchilar"
        description="Saytga kirgan odamlar, qaysi sahifani ochgani va nimalarni bosgani."
      >
        <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
          {[7, 30, 90].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setDays(value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                days === value ? "bg-background font-medium shadow-card" : "text-muted-foreground",
              )}
            >
              {value} kun
            </button>
          ))}
        </div>
      </StatsPageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {!summary ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KPICard label="Jami tashrif buyuruvchilar" value={summary.total.toLocaleString()} icon={Users} />
            <KPICard
              label="Hozir saytda"
              value={summary.online.toLocaleString()}
              hint={`Bugun: ${summary.today}`}
              icon={Radio}
            />
            <KPICard
              label="Sahifa ko'rishlar"
              value={summary.pageviews.toLocaleString()}
              hint={`${days} kun · yangi: ${summary.newVisitors}`}
              icon={Eye}
            />
            <KPICard label="Bosishlar" value={summary.clicks.toLocaleString()} hint={`${days} kun`} icon={MousePointerClick} />
          </>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-heading text-lg font-semibold">Kunlik harakat</h2>
        <p className="mt-1 text-sm text-muted-foreground">Qora — sahifa, kulrang — bosish</p>
        <div className="mt-4 flex h-40 items-end gap-1">
          {daily.map((row) => (
            <div key={row.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <div className="flex h-32 w-full items-end justify-center gap-0.5">
                <div
                  className="w-1/2 rounded-t bg-foreground/80"
                  style={{ height: `${Math.max(2, (row.pageviews / maxBar) * 100)}%` }}
                  title={`${row.pageviews} sahifa`}
                />
                <div
                  className="w-1/2 rounded-t bg-muted-foreground/40"
                  style={{ height: `${Math.max(2, (row.clicks / maxBar) * 100)}%` }}
                  title={`${row.clicks} bosish`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-heading text-lg font-semibold">Oxirgi tashriflar</h2>
          </div>
          {q.isLoading ? (
            <div className="p-5 text-sm text-muted-foreground">Yuklanmoqda…</div>
          ) : !q.data?.visitors.length ? (
            <EmptyState title="Hali tashrif yo'q" description="Sayt ochilganda odamlar shu yerda ko'rinadi." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Odam</th>
                    <th className="px-4 py-3 font-medium">Qurilma</th>
                    <th className="px-4 py-3 font-medium">Oxirgi sahifa</th>
                    <th className="px-4 py-3 font-medium">Kirish</th>
                    <th className="px-4 py-3 font-medium">Sahifa</th>
                    <th className="px-4 py-3 font-medium">Bosish</th>
                    <th className="px-4 py-3 font-medium">Oxirgi faollik</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.visitors.map((visitor) => (
                    <tr
                      key={visitor.id}
                      className={cn(
                        "cursor-pointer border-t border-border hover:bg-muted/40",
                        selectedId === visitor.id && "bg-muted/60",
                      )}
                      onClick={() => setSelectedId(visitor.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{visitor.name}</div>
                        <div className="text-xs text-muted-foreground">{visitor.phone || visitor.ip || "—"}</div>
                      </td>
                      <td className="px-4 py-3">{visitor.device || "—"}</td>
                      <td className="max-w-[180px] truncate px-4 py-3">{visitor.lastPath || "—"}</td>
                      <td className="px-4 py-3">{visitor.visits}</td>
                      <td className="px-4 py-3">{visitor.pageviews}</td>
                      <td className="px-4 py-3">{visitor.clicks}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatWhen(visitor.lastSeen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-heading text-lg font-semibold">Harakatlar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Qatordan odamni tanlang.</p>
          <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto">
            {!selectedId ? (
              <p className="text-sm text-muted-foreground">Hali tanlanmagan.</p>
            ) : !q.data?.events.length ? (
              <p className="text-sm text-muted-foreground">Bu odamda harakat yozuvi yo'q.</p>
            ) : (
              q.data.events.map((event) => (
                <div key={event.id} className="rounded-xl border border-border px-3 py-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{event.kind === "page" ? "Sahifa" : "Bosish"}</span>
                    <span>{formatWhen(event.at)}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium">{event.label || event.path || "—"}</p>
                  {event.path ? <p className="truncate text-xs text-muted-foreground">{event.path}</p> : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
