import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Building2, QrCode, UserPlus } from "lucide-react";
import {
  downloadStatisticsCsv,
  fetchAdminUserSignupAnalytics,
  fetchAgentPlatformStats,
} from "@/lib/admin-api";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatsPageHeader } from "@/components/admin/StatisticsShell";
import { DonutChart, DualBarChart } from "@/components/admin/StatsCharts";

export const Route = createFileRoute("/admin/statistics/salons")({
  component: StatisticsSalonsPage,
});

function StatisticsSalonsPage() {
  const q = useQuery({
    queryKey: ["admin", "stats-salons"],
    queryFn: () => fetchAdminUserSignupAnalytics(150),
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });

  const agentsQ = useQuery({
    queryKey: ["admin", "agent-stats-salons-page"],
    queryFn: fetchAgentPlatformStats,
    refetchInterval: 15_000,
  });

  const salons = q.data?.salons;
  const summary = salons?.summary;
  const agents = agentsQ.data;

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Salonlar"
        description="Platformaga qo'shilgan salonlar — chiqarilgan, tekshiruvda va agent orqali."
        onExport={() => downloadStatisticsCsv("salons")}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {q.isLoading || !summary ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KPICard label="Jami salon" value={summary.total.toLocaleString()} icon={Building2} />
            <KPICard label="Chiqarilgan" value={summary.published.toLocaleString()} />
            <KPICard label="Tekshiruvda" value={summary.pending.toLocaleString()} />
            <KPICard label="Bugun" value={summary.todayTotal.toLocaleString()} hint={`Chiq ${summary.todayPublished} · Tek ${summary.todayPending}`} />
            <KPICard label="7 kun" value={summary.weekTotal.toLocaleString()} hint={`Chiq ${summary.weekPublished} · Tek ${summary.weekPending}`} />
            <KPICard label="Chiqarilgan ulush" value={`${summary.total > 0 ? Math.round((summary.published / summary.total) * 100) : 0}%`} />
          </>
        )}
      </div>

      {agents && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Agent orqali
            </p>
            <Link to="/admin/statistics/agents" className="text-sm font-semibold hover:underline">
              Agent statistikasi →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard label="Agent salonlari" value={agents.salons_referred.toLocaleString()} icon={UserPlus} />
            <KPICard label="Trialda" value={agents.salons_trial.toLocaleString()} icon={QrCode} />
            <KPICard label="Trial tugagan" value={agents.salons_expired.toLocaleString()} />
            <KPICard label="Faol agentlar" value={agents.agents_active.toLocaleString()} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6 lg:col-span-2">
          <h2 className="font-heading text-lg font-semibold">So'nggi 7 kun</h2>
          <p className="text-sm text-muted-foreground mt-1">Qo'shilgan salonlar (chiqarilgan vs tekshiruvda)</p>
          {q.isLoading || !salons ? (
            <div className="mt-6 h-56 animate-pulse rounded-xl bg-muted/40" />
          ) : (
            <div className="mt-4">
              <DualBarChart data={salons.daily} keys={["published", "pending"]} />
            </div>
          )}
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Holat bo'yicha</h2>
          <p className="text-sm text-muted-foreground mt-1">Jami salonlar taqsimoti</p>
          {q.isLoading || !summary ? (
            <div className="mt-6 h-48 animate-pulse rounded-xl bg-muted/40" />
          ) : (
            <DonutChart
              slices={[
                { name: "Chiqarilgan", value: summary.published, color: "hsl(142 55% 38%)" },
                { name: "Tekshiruvda", value: summary.pending, color: "hsl(38 92% 50%)" },
              ]}
            />
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold">So'nggi qo'shilgan salonlar</h2>
        </div>
        {q.isLoading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : !salons || salons.recent.length === 0 ? (
          <EmptyState title="Hali salon yo'q" description="Birinchi salon qo'shilganda shu yerda ko'rinadi." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Salon</th>
                  <th className="px-6 py-3 font-medium">Egasi</th>
                  <th className="px-6 py-3 font-medium">Hudud</th>
                  <th className="px-6 py-3 font-medium">Holat</th>
                  <th className="px-6 py-3 font-medium">Vaqt</th>
                  <th className="px-6 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {salons.recent.map((row) => (
                  <tr key={row.id} className="hover:bg-background/50">
                    <td className="px-6 py-4">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{row.address || row.phone || "—"}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{row.ownerName || "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{row.regionLabel || "Ko'rsatilmagan"}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={row.isPublished ? "published" : "draft"} />
                    </td>
                    <td className="px-6 py-4 tabular-nums text-muted-foreground">
                      {row.createdAt ? format(parseISO(row.createdAt), "dd.MM.yyyy HH:mm") : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to="/admin/salons/$salonId"
                        params={{ salonId: String(row.id) }}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Salon
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
