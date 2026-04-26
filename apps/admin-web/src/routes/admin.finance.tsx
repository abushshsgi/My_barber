import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Wallet, Receipt, Users } from "lucide-react";
import { fetchFinanceSummary } from "@/lib/admin-api";
import { KPICard } from "@/components/admin/KPICard";

export const Route = createFileRoute("/admin/finance")({ component: FinancePage });

function FinancePage() {
  const q = useQuery({ queryKey: ["admin", "finance"], queryFn: fetchFinanceSummary });
  const d = q.data;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Daromad
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Moliyaviy umumiy ko'rsatkichlar.</p>
      </div>

      {d && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Umumiy daromad"
              value={`${(d.revenue_total / 1_000_000).toFixed(1)}M so'm`}
              delta={5.2}
            />
            <KPICard
              label="Bu hafta"
              value={`${(d.revenue_week / 1_000_000).toFixed(1)}M so'm`}
              delta={8.1}
            />
            <KPICard
              label="Komissiya"
              value={`${(d.commission_total / 1_000_000).toFixed(1)}M so'm`}
              delta={4.8}
            />
            <KPICard
              label="Kutilayotgan"
              value={`${(d.pending_payouts / 1_000_000).toFixed(1)}M so'm`}
              delta={-1.2}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-card p-6">
              <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
                Haftalik daromad
              </h2>
              <div className="flex items-end gap-3 h-48">
                {d.weekly.map((w) => {
                  const max = Math.max(...d.weekly.map((x) => x.revenue));
                  const h = (w.revenue / max) * 100;
                  return (
                    <div key={w.day} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full bg-secondary rounded-t-lg flex items-end"
                        style={{ height: "180px" }}
                      >
                        <div
                          className="w-full bg-foreground rounded-t-lg transition-all"
                          style={{ height: `${h}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">{w.day}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-card p-6">
              <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
                Top sartaroshlar
              </h2>
              <div className="space-y-3">
                {d.top_barbers.map((b, i) => (
                  <div key={b.id} className="flex items-center gap-3">
                    <div className="size-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <img src={b.avatar} className="size-8 rounded-full object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">{b.name}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {(b.revenue / 1_000_000).toFixed(2)}M so'm
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
