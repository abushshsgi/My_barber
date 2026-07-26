import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fetchAgentSalonsHub } from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const Route = createFileRoute("/admin/agents/salons")({
  component: AdminAgentSalonsPage,
});

function AdminAgentSalonsPage() {
  const q = useQuery({
    queryKey: ["admin", "agent-salons-hub"],
    queryFn: () => fetchAgentSalonsHub({ limit: 200 }),
  });

  const rows = q.data?.results ?? [];
  const totals = q.data?.totals;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Agent salonlari</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Agentlar orqali ro&apos;yxatdan o&apos;tgan salonlar, aylanma (GMV) va holat.
          </p>
        </div>
        <Link to="/admin/agents" className="text-sm font-medium hover:underline">
          ← Umumiy
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {q.isLoading || !totals ? (
          Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KPICard label="Salonlar" value={totals.count} />
            <KPICard label="Yakunlangan bron" value={totals.bookings_completed} />
            <KPICard label="GMV" value={formatAdminUzs(totals.gmv_uzs)} />
          </>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {q.isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Agent orqali kelgan salon yo&apos;q
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-muted-foreground border-b bg-background">
                <tr>
                  <th className="px-4 py-3">Salon</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Egasi</th>
                  <th className="px-4 py-3">Holat</th>
                  <th className="px-4 py-3">Bron / GMV</th>
                  <th className="px-4 py-3">Sana</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-background/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {s.address || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.agent_id ? (
                        <Link
                          to="/admin/agents/$agentId"
                          params={{ agentId: String(s.agent_id) }}
                          className="hover:underline font-medium"
                        >
                          {s.agent_name}
                        </Link>
                      ) : (
                        "—"
                      )}
                      <div className="text-xs font-mono text-muted-foreground">
                        {s.agent_code}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{s.owner_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.owner_phone || s.owner_email || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={
                          s.trial_active
                            ? "trial"
                            : s.subscription_status === "active"
                              ? "active"
                              : s.subscription_status || "none"
                        }
                      />
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <div>{s.bookings_completed}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatAdminUzs(s.gmv_uzs)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(new Date(s.created_at), "dd MMM yyyy")}
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
