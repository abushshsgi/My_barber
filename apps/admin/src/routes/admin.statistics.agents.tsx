import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, QrCode, Scissors, UserPlus, Users } from "lucide-react";
import { fetchAgentPlatformStats } from "@/lib/admin-api";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";
import { StatsPageHeader, useStatsRange } from "@/components/admin/StatisticsShell";
import { formatAdminUzs } from "@/lib/admin-analytics";

export const Route = createFileRoute("/admin/statistics/agents")({
  component: AgentStatisticsPage,
});

function AgentStatisticsPage() {
  const { rangeKey, setRangeKey } = useStatsRange("30d");

  const q = useQuery({
    queryKey: ["admin", "agent-stats-page"],
    queryFn: fetchAgentPlatformStats,
    refetchInterval: 15_000,
  });

  const d = q.data;

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Agent statistikasi"
        description="Sotuv agentlari orqali olib kelingan salonlar, trial va reyting."
        rangeKey={rangeKey}
        onRangeChange={setRangeKey}
      >
        <Link
          to="/admin/agents"
          className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow-card hover:bg-muted"
        >
          Agentlar →
        </Link>
      </StatsPageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {q.isLoading || !d ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KPICard label="Jami agent" value={d.agents_total.toLocaleString()} icon={Users} />
            <KPICard
              label="Faol agent"
              value={d.agents_active.toLocaleString()}
              icon={UserPlus}
            />
            <KPICard
              label="Salonlar"
              value={d.salons_referred.toLocaleString()}
              icon={Building2}
            />
            <KPICard label="Trialda" value={d.salons_trial.toLocaleString()} icon={QrCode} />
            <KPICard
              label="Barberlar"
              value={d.barbers_referred.toLocaleString()}
              icon={Scissors}
            />
            <KPICard
              label="Trial qiymati"
              value={formatAdminUzs(d.trial_value_uzs)}
              hint={`${d.trial_days} kun bepul`}
            />
          </>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="font-heading text-lg font-semibold">Reyting</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Eng ko&apos;p salon olib kelgan agentlar
          </p>
        </div>
        {q.isLoading || !d ? (
          <TableSkeleton rows={5} cols={5} />
        ) : d.leaderboard.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Hali ma&apos;lumot yo&apos;q
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">#</th>
                  <th className="px-6 py-3 font-medium">Agent</th>
                  <th className="px-6 py-3 font-medium">Kod</th>
                  <th className="px-6 py-3 font-medium">Salonlar</th>
                  <th className="px-6 py-3 font-medium">Trial</th>
                  <th className="px-6 py-3 font-medium">Barberlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.leaderboard.map((row, i) => (
                  <tr key={row.id} className="hover:bg-background/50">
                    <td className="px-6 py-3 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-6 py-3">
                      <div className="font-medium">{row.full_name}</div>
                      <div className="text-xs text-muted-foreground">{row.email}</div>
                    </td>
                    <td className="px-6 py-3">
                      <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                        {row.code}
                      </code>
                    </td>
                    <td className="px-6 py-3 tabular-nums font-semibold">
                      {row.salons_referred}
                    </td>
                    <td className="px-6 py-3 tabular-nums">{row.salons_trial}</td>
                    <td className="px-6 py-3 tabular-nums">{row.barbers_referred}</td>
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
