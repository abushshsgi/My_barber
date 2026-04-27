import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { fetchPayouts, markPayoutPaid } from "@/lib/admin-api";
import { TableSkeleton } from "@/components/admin/Skeletons";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const Route = createFileRoute("/admin/finance/payouts")({ component: PayoutsPage });

function PayoutsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "payouts"], queryFn: () => fetchPayouts() });
  const m = useMutation({
    mutationFn: markPayoutPaid,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "payouts"] });
      toast.success("To'lov o'tkazildi");
    },
  });
  const data = q.data ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          To'lovlar
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Sartaroshlarga haftalik to'lovlar.</p>
      </div>
      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {q.isLoading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Sartarosh</th>
                <th className="px-6 py-3 font-medium">Davr</th>
                <th className="px-6 py-3 font-medium text-right">Summa</th>
                <th className="px-6 py-3 font-medium">Holat</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((p) => (
                <tr key={p.id} className="hover:bg-background/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.barber_avatar}
                        className="size-8 rounded-full object-cover"
                        alt=""
                      />
                      <span className="font-medium text-foreground">{p.barber_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{p.period}</td>
                  <td className="px-6 py-4 text-right tabular-nums font-medium text-foreground">
                    {p.amount.toLocaleString()} so'm
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge
                      status={
                        p.status === "paid"
                          ? "completed"
                          : p.status === "failed"
                            ? "cancelled"
                            : "pending"
                      }
                      label={p.status}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {p.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => m.mutate(p.id)}
                        disabled={m.isPending}
                      >
                        To'lash
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
