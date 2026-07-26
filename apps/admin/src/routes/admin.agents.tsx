import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Banknote,
  Building2,
  LayoutDashboard,
  Scissors,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { fetchAgentHubOverview } from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";

export const Route = createFileRoute("/admin/agents")({
  component: AdminAgentsHubPage,
});

function kindLabel(kind: string) {
  if (kind === "salon_advance") return "Salon avans";
  if (kind === "commission") return "Komissiya";
  return kind;
}

function AdminAgentsHubPage() {
  const q = useQuery({
    queryKey: ["admin", "agent-hub"],
    queryFn: fetchAgentHubOverview,
    refetchInterval: 20_000,
  });

  const s = q.data?.summary;
  const leaderboard = q.data?.leaderboard ?? [];
  const events = q.data?.recent_events ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Agentlar
          </h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
            Sotuv agentlari faoliyati, salonlar, avans/komissiya va payoutlar —
            hammasi bir joyda (DB dan).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/agents/team"
            className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow-card hover:bg-muted"
          >
            Jamoa
          </Link>
          <Link
            to="/admin/agents/salons"
            className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow-card hover:bg-muted"
          >
            Salonlar
          </Link>
          <Link
            to="/admin/agents/aylanma"
            className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow-card hover:bg-muted"
          >
            Aylanma
          </Link>
          <Link
            to="/admin/agents/payouts"
            className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow-card hover:bg-muted"
          >
            Payout
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        {q.isLoading || !s ? (
          Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KPICard label="Agentlar" value={s.agents_total} icon={Users} />
            <KPICard label="Faol" value={s.agents_active} icon={UserPlus} />
            <KPICard label="Salonlar" value={s.salons_referred} icon={Building2} />
            <KPICard label="Trialda" value={s.salons_trial} icon={LayoutDashboard} />
            <KPICard label="Barberlar" value={s.barbers_referred} icon={Scissors} />
            <KPICard
              label="Berilgan avans"
              value={formatAdminUzs(s.advance_total_uzs)}
              icon={Wallet}
            />
            <KPICard
              label="Komissiya"
              value={formatAdminUzs(s.commission_total_uzs)}
              icon={TrendingUp}
            />
            <KPICard
              label="Payout navbati"
              value={formatAdminUzs(s.payout_pending_uzs)}
              icon={Banknote}
            />
          </>
        )}
      </div>

      {s ? (
        <p className="text-xs text-muted-foreground">
          Tarif: salon avans {formatAdminUzs(s.salon_advance_uzs)} · agent komissiya{" "}
          {formatAdminUzs(s.commission_uzs)} · trial {s.trial_days} kun (
          {formatAdminUzs(s.trial_value_uzs)}) · agent hamyonlari{" "}
          {formatAdminUzs(s.agent_wallets_balance_uzs)} · salon GMV{" "}
          {formatAdminUzs(s.referred_salons_gmv_uzs)}
        </p>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-heading text-lg font-semibold">Reyting</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Salonlar soni, avans va komissiya
            </p>
          </div>
          {q.isLoading ? (
            <TableSkeleton rows={6} cols={4} />
          ) : leaderboard.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Hali agent yo&apos;q
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase text-muted-foreground border-b bg-background">
                  <tr>
                    <th className="px-4 py-3">Agent</th>
                    <th className="px-4 py-3">Salon</th>
                    <th className="px-4 py-3">Avans</th>
                    <th className="px-4 py-3">Komissiya</th>
                    <th className="px-4 py-3">Hamyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leaderboard.map((r) => (
                    <tr key={r.id} className="hover:bg-background/50">
                      <td className="px-4 py-3">
                        <Link
                          to="/admin/agents/$agentId"
                          params={{ agentId: String(r.id) }}
                          className="font-medium hover:underline"
                        >
                          {r.full_name}
                        </Link>
                        <div className="text-xs font-mono text-muted-foreground">
                          {r.code}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{r.salons_referred}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatAdminUzs(r.advance_sum)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatAdminUzs(r.commission_sum)}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium">
                        {formatAdminUzs(r.wallet_balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-heading text-lg font-semibold">So&apos;nggi hodisalar</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Avans va komissiya yozuvlari
            </p>
          </div>
          {q.isLoading ? (
            <TableSkeleton rows={6} cols={3} />
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Hodisalar yo&apos;q
            </div>
          ) : (
            <ul className="divide-y max-h-[420px] overflow-y-auto">
              {events.map((ev) => (
                <li key={ev.id} className="px-5 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{kindLabel(ev.kind)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {ev.agent_name} ({ev.agent_code})
                        {ev.salon_name ? ` · ${ev.salon_name}` : ""}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold tabular-nums">
                        {formatAdminUzs(ev.amount_uzs)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {format(new Date(ev.created_at), "dd MMM HH:mm")}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
