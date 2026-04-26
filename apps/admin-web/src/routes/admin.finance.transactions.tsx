import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fetchTransactions } from "@/lib/admin-api";
import { TableSkeleton } from "@/components/admin/Skeletons";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  booking: "Bron",
  commission: "Komissiya",
  payout: "To'lov",
  refund: "Qaytarish",
};

export const Route = createFileRoute("/admin/finance/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const q = useQuery({ queryKey: ["admin", "transactions"], queryFn: () => fetchTransactions() });
  const data = q.data ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Tranzaksiyalar
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Barcha moliyaviy operatsiyalar.</p>
      </div>
      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {q.isLoading ? (
          <TableSkeleton rows={10} cols={5} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">ID</th>
                <th className="px-6 py-3 font-medium">Tur</th>
                <th className="px-6 py-3 font-medium">Bog'liq</th>
                <th className="px-6 py-3 font-medium text-right">Summa</th>
                <th className="px-6 py-3 font-medium">Holat</th>
                <th className="px-6 py-3 font-medium">Vaqt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((t) => (
                <tr key={t.id} className="hover:bg-background/50">
                  <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{t.id}</td>
                  <td className="px-6 py-3 text-foreground">{TYPE_LABELS[t.type]}</td>
                  <td className="px-6 py-3 text-muted-foreground">{t.related_name}</td>
                  <td
                    className={cn(
                      "px-6 py-3 text-right tabular-nums font-medium",
                      t.amount < 0 ? "text-destructive" : "text-foreground",
                    )}
                  >
                    {t.amount.toLocaleString()} so'm
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge
                      status={
                        t.status === "completed"
                          ? "completed"
                          : t.status === "failed"
                            ? "cancelled"
                            : "pending"
                      }
                      label={t.status}
                    />
                  </td>
                  <td className="px-6 py-3 text-muted-foreground tabular-nums text-xs">
                    {format(new Date(t.created_at), "dd MMM HH:mm")}
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
