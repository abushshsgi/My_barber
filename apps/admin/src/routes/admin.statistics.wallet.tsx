import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ArrowDownCircle, ArrowUpCircle, Gift, Wallet } from "lucide-react";
import { downloadStatisticsCsv, fetchPlatformWallet } from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatsPageHeader, useStatsRange } from "@/components/admin/StatisticsShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/statistics/wallet")({
  component: StatisticsWalletPage,
});

const ENTRY_META: Record<string, { label: string; className: string }> = {
  topup: { label: "To'ldirish", className: "bg-emerald-500/10 text-emerald-700" },
  booking_pay: { label: "Bron to'lovi", className: "bg-blue-500/10 text-blue-700" },
  gift_out: { label: "Sovg'a (chiqim)", className: "bg-purple-500/10 text-purple-700" },
  gift_in: { label: "Sovg'a (kirim)", className: "bg-purple-500/10 text-purple-700" },
  gift_design_fee: { label: "Sovg'a dizayn", className: "bg-purple-500/10 text-purple-700" },
  refund: { label: "Qaytarish", className: "bg-amber-500/10 text-amber-700" },
  adjustment: { label: "Tuzatish", className: "bg-muted text-muted-foreground" },
};

const SOURCE_LABELS: Record<string, string> = {
  admin_topup: "Admin",
  debug_topup: "Test",
  click_checkout: "Click",
  payme_checkout: "Payme",
  unknown: "Noma'lum",
};

function StatisticsWalletPage() {
  const { rangeKey, setRangeKey, range } = useStatsRange("30d");

  const q = useQuery({
    queryKey: ["admin", "stats-wallet", range.start, range.end],
    queryFn: () => fetchPlatformWallet(range),
    refetchInterval: 15_000,
  });

  const d = q.data;
  const maxSpend = Math.max(1, ...(d?.spend_types.map((s) => s.amount) ?? [1]));

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Hamyon"
        description="To'ldirish, sarflash va sovg'alar — mijoz pul oqimi (B2C)."
        rangeKey={rangeKey}
        onRangeChange={setRangeKey}
        onExport={() => downloadStatisticsCsv("wallet", { range })}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {q.isLoading || !d ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KPICard label="To'ldirilgan" value={formatAdminUzs(d.summary.topup_total)} icon={ArrowDownCircle} />
            <KPICard label="To'ldirgan kishilar" value={d.summary.topup_users.toLocaleString()} icon={Wallet} />
            <KPICard label="Sarflangan" value={formatAdminUzs(d.summary.spend_total)} icon={ArrowUpCircle} />
            <KPICard label="Sarflagan kishilar" value={d.summary.spend_users.toLocaleString()} />
            <KPICard label="Sovg'alar" value={formatAdminUzs(d.summary.gift_total)} icon={Gift} hint={`${d.summary.gift_count} ta`} />
            <KPICard label="Qaytarishlar" value={formatAdminUzs(d.summary.refund_total)} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">To'ldirish manbalari</h2>
          <p className="text-sm text-muted-foreground mt-1">Pul qayerdan kelgan</p>
          {q.isLoading || !d ? (
            <div className="mt-4 h-32 animate-pulse rounded-xl bg-muted/40" />
          ) : d.topup_sources.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Ma'lumot yo'q.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {d.topup_sources.map((row) => (
                <li key={row.source} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{SOURCE_LABELS[row.source] || row.source}</span>
                  <span className="text-xs text-muted-foreground">{row.count} ta</span>
                  <span className="font-semibold tabular-nums">{formatAdminUzs(row.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Sarf turlari</h2>
          <p className="text-sm text-muted-foreground mt-1">Mijozlar pulni nimaga ishlatmoqda</p>
          {q.isLoading || !d ? (
            <div className="mt-4 h-32 animate-pulse rounded-xl bg-muted/40" />
          ) : (
            <ul className="mt-4 space-y-4">
              {d.spend_types.map((row) => (
                <li key={row.type}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold tabular-nums">{formatAdminUzs(row.amount)}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-foreground/70" style={{ width: `${(row.amount / maxSpend) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold">So'nggi tranzaksiyalar</h2>
        </div>
        {q.isLoading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : !d || d.recent.length === 0 ? (
          <EmptyState title="Tranzaksiya yo'q" description="Tanlangan davrda hamyon harakati bo'lmagan." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Mijoz</th>
                  <th className="px-6 py-3 font-medium">Tur</th>
                  <th className="px-6 py-3 font-medium text-right">Summa</th>
                  <th className="px-6 py-3 font-medium text-right">Qoldiq</th>
                  <th className="px-6 py-3 font-medium">Vaqt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.recent.map((row) => {
                  const meta = ENTRY_META[row.entry_type] ?? { label: row.entry_type, className: "bg-muted text-muted-foreground" };
                  const positive = row.amount >= 0;
                  return (
                    <tr key={row.id} className="hover:bg-background/50">
                      <td className="px-6 py-4 font-medium">{row.user_name}</td>
                      <td className="px-6 py-4">
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", meta.className)}>
                          {meta.label}
                        </span>
                      </td>
                      <td className={cn("px-6 py-4 text-right tabular-nums font-semibold", positive ? "text-emerald-600" : "text-destructive")}>
                        {positive ? "+" : "−"}
                        {formatAdminUzs(Math.abs(row.amount))}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">{formatAdminUzs(row.balance_after)}</td>
                      <td className="px-6 py-4 tabular-nums text-muted-foreground">
                        {row.created_at ? format(parseISO(row.created_at), "dd.MM.yyyy HH:mm") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
