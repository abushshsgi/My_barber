import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchFinanceSummary } from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { resolveMediaUrl } from "@/lib/media-url";

export const Route = createFileRoute("/admin/finance/")({
  component: FinanceOverviewPage,
});

function FinanceOverviewPage() {
  const q = useQuery({ queryKey: ["admin", "finance"], queryFn: fetchFinanceSummary });
  const d = q.data;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Daromad
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Moliyaviy umumiy ko'rsatkichlar.</p>
      </div>

      {q.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : q.isError ? (
        <EmptyState
          title="Ma'lumot yuklanmadi"
          description="Moliyaviy ko'rsatkichlarni yuklab bo'lmadi. Sahifani yangilab ko'ring."
        />
      ) : d ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard label="Umumiy daromad" value={formatAdminUzs(d.revenue_total)} />
            <KPICard label="Bu hafta" value={formatAdminUzs(d.revenue_week)} />
            <KPICard label="Komissiya" value={formatAdminUzs(d.commission_total)} />
            <KPICard label="Kutilayotgan" value={formatAdminUzs(d.pending_payouts)} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card lg:col-span-2">
              <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">
                Haftalik daromad
              </h2>
              <div className="flex h-48 items-end gap-3">
                {(() => {
                  const max = Math.max(0, ...d.weekly.map((x) => x.revenue));
                  return d.weekly.map((w) => {
                    const h = max > 0 ? (w.revenue / max) * 100 : 0;
                    return (
                      <div key={w.day} className="flex flex-1 flex-col items-center gap-2">
                        <div
                          className="flex w-full items-end rounded-t-lg bg-secondary"
                          style={{ height: "180px" }}
                          title={formatAdminUzs(w.revenue)}
                        >
                          <div
                            className="w-full rounded-t-lg bg-foreground transition-all"
                            style={{ height: `${h}%`, minHeight: w.revenue > 0 ? "4px" : 0 }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">{w.day}</div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">
                Top sartaroshlar
              </h2>
              {d.top_barbers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Hali yakunlangan bronlar bo'yicha reyting yo'q.
                </p>
              ) : (
                <div className="space-y-3">
                  {d.top_barbers.map((b, i) => {
                    const avatarSrc = resolveMediaUrl(b.avatar);
                    return (
                      <div key={b.id || i} className="flex items-center gap-3">
                        <div className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                          {i + 1}
                        </div>
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            className="size-8 rounded-full object-cover"
                            alt=""
                          />
                        ) : (
                          <div className="size-8 rounded-full bg-muted" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">{b.name}</div>
                          <div className="text-xs tabular-nums text-muted-foreground">
                            {formatAdminUzs(b.revenue)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
