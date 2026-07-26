import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  fetchAgentPayouts,
  markAgentPayoutPaid,
  rejectAgentPayout,
} from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { TableSkeleton } from "@/components/admin/Skeletons";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/agents/payouts")({
  component: AdminAgentPayoutsPage,
});

function AdminAgentPayoutsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "agent-payouts"],
    queryFn: () => fetchAgentPayouts("pending"),
  });
  const allQ = useQuery({
    queryKey: ["admin", "agent-payouts-all"],
    queryFn: () => fetchAgentPayouts(),
  });

  const paidMut = useMutation({
    mutationFn: (id: number) => markAgentPayoutPaid(id),
    onSuccess: () => {
      toast.success("To'landi deb belgilandi");
      qc.invalidateQueries({ queryKey: ["admin", "agent-payouts"] });
      qc.invalidateQueries({ queryKey: ["admin", "agent-payouts-all"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Xato"),
  });
  const rejectMut = useMutation({
    mutationFn: (id: number) => rejectAgentPayout(id, "Admin rad etdi"),
    onSuccess: () => {
      toast.success("Rad etildi, balans qaytarildi");
      qc.invalidateQueries({ queryKey: ["admin", "agent-payouts"] });
      qc.invalidateQueries({ queryKey: ["admin", "agent-payouts-all"] });
    },
  });

  const pending = q.data ?? [];
  const all = allQ.data ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Agent payoutlar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Agentlar komissiyasini kartaga o&apos;tkazing yoki rad eting.
          </p>
        </div>
        <Link to="/admin/agents" className="text-sm font-medium hover:underline">
          ← Agentlar
        </Link>
      </div>

      <Section title="Kutilayotgan">
        {q.isLoading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : pending.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Navbat bo&apos;sh</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-muted-foreground border-b bg-background">
              <tr>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Summa</th>
                <th className="px-4 py-3">Karta</th>
                <th className="px-4 py-3">Sana</th>
                <th className="px-4 py-3">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pending.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <Link
                      to="/admin/agents/$agentId"
                      params={{ agentId: String(p.agent_id) }}
                      className="font-medium hover:underline"
                    >
                      {p.agent_name}
                    </Link>
                    <div className="text-xs font-mono text-muted-foreground">{p.agent_code}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatAdminUzs(p.amount)}</td>
                  <td className="px-4 py-3 text-xs">
                    {p.holder_name} · {p.bank_name} · ****{p.card_last4}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {format(new Date(p.created_at), "dd MMM HH:mm")}
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <Button size="sm" onClick={() => paidMut.mutate(p.id)}>
                      To&apos;landi
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectMut.mutate(p.id)}
                    >
                      Rad
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Barcha so'rovlar">
        {allQ.isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-muted-foreground border-b bg-background">
              <tr>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Summa</th>
                <th className="px-4 py-3">Holat</th>
                <th className="px-4 py-3">Sana</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {all.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">{p.agent_name}</td>
                  <td className="px-4 py-3">{formatAdminUzs(p.amount)}</td>
                  <td className="px-4 py-3">{p.status}</td>
                  <td className="px-4 py-3 text-xs">
                    {format(new Date(p.created_at), "dd MMM HH:mm")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}
