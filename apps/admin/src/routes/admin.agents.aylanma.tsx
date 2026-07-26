import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fetchAgentAylanmaHub } from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";

export const Route = createFileRoute("/admin/agents/aylanma")({
  component: AdminAgentAylanmaPage,
});

function AdminAgentAylanmaPage() {
  const q = useQuery({
    queryKey: ["admin", "agent-aylanma"],
    queryFn: fetchAgentAylanmaHub,
  });

  const advances = q.data?.advances ?? [];
  const commissions = q.data?.commissions ?? [];
  const ledger = q.data?.ledger ?? [];
  const totals = q.data?.totals;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
          <h1 className="font-heading text-3xl font-semibold">Agent aylanmasi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Salonlarga berilgan avanslar, agent komissiyalari va hamyon ledger.
          </p>
        </div>

      <div className="grid grid-cols-2 gap-4 max-w-xl">
        {q.isLoading || !totals ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <KPICard label="Avanslar (ro'yxat)" value={formatAdminUzs(totals.advance_uzs)} />
            <KPICard label="Komissiyalar" value={formatAdminUzs(totals.commission_uzs)} />
          </>
        )}
      </div>

      <MoneyTable
        title="Salon avanslari"
        loading={q.isLoading}
        rows={advances}
      />
      <MoneyTable
        title="Agent komissiyalari"
        loading={q.isLoading}
        rows={commissions}
      />

      <section className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-heading text-lg font-semibold">Agent ledger</h2>
        </div>
        {q.isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : ledger.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Bo&apos;sh</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-muted-foreground border-b bg-background">
                <tr>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Tur</th>
                  <th className="px-4 py-3">Summa</th>
                  <th className="px-4 py-3">Balans</th>
                  <th className="px-4 py-3">Sana</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ledger.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <Link
                        to="/admin/agents/$agentId"
                        params={{ agentId: String(r.agent_id) }}
                        className="font-medium hover:underline"
                      >
                        {r.agent_name}
                      </Link>
                      <div className="text-xs font-mono text-muted-foreground">
                        {r.agent_code}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs uppercase">{r.entry_type}</td>
                    <td className="px-4 py-3 tabular-nums font-medium">
                      {formatAdminUzs(r.amount)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatAdminUzs(r.balance_after)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "dd MMM HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function MoneyTable({
  title,
  loading,
  rows,
}: {
  title: string;
  loading: boolean;
  rows: Array<{
    id: number;
    amount_uzs: number;
    created_at: string;
    agent_id: number;
    agent_name: string;
    agent_code: string;
    salon_id: number | null;
    salon_name: string;
  }>;
}) {
  return (
    <section className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
      </div>
      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Bo&apos;sh</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-muted-foreground border-b bg-background">
              <tr>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Salon</th>
                <th className="px-4 py-3">Summa</th>
                <th className="px-4 py-3">Sana</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <Link
                      to="/admin/agents/$agentId"
                      params={{ agentId: String(r.agent_id) }}
                      className="font-medium hover:underline"
                    >
                      {r.agent_name}
                    </Link>
                    <div className="text-xs font-mono text-muted-foreground">
                      {r.agent_code}
                    </div>
                  </td>
                  <td className="px-4 py-3">{r.salon_name || "—"}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold">
                    {formatAdminUzs(r.amount_uzs)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {format(new Date(r.created_at), "dd MMM HH:mm")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
