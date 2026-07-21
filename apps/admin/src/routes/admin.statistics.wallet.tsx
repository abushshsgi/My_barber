import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Gift,
  Hash,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { downloadStatisticsCsv, fetchPlatformWallet } from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { LiveMoneyHero } from "@/components/admin/LiveMoneyHero";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatsPageHeader, useStatsRange } from "@/components/admin/StatisticsShell";
import { LivePulseBadge } from "@/components/admin/LiveMetricHero";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/statistics/wallet")({
  component: StatisticsWalletPage,
});

const ENTRY_META: Record<string, { label: string; className: string }> = {
  topup: { label: "To'ldirish", className: "bg-emerald-500/10 text-emerald-700" },
  booking_pay: { label: "Bron to'lovi", className: "bg-blue-500/10 text-blue-700" },
  gift_out: { label: "Sovg'a (chiqim)", className: "bg-violet-500/10 text-violet-700" },
  gift_in: { label: "Sovg'a (kirim)", className: "bg-violet-500/10 text-violet-700" },
  gift_design_fee: { label: "Sovg'a dizayn", className: "bg-violet-500/10 text-violet-700" },
  subscription: { label: "Obuna", className: "bg-sky-500/10 text-sky-700" },
  refund: { label: "Qaytarish", className: "bg-amber-500/10 text-amber-700" },
  adjustment: { label: "Tuzatish", className: "bg-muted text-muted-foreground" },
};

const SOURCE_LABELS: Record<string, string> = {
  card_manual: "Karta",
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
    refetchInterval: 8_000,
    refetchIntervalInBackground: true,
  });

  const d = q.data;
  const maxSpend = Math.max(1, ...(d?.spend_types.map((s) => s.amount) ?? [1]));
  const flowTotal = d?.summary.flow_total ?? 0;

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Hamyon oqimi"
        description="To'ldirish, sarflash va sovg'alar — kim nima qilayotgani real vaqtda."
        rangeKey={rangeKey}
        onRangeChange={setRangeKey}
        onExport={() => downloadStatisticsCsv("wallet", { range })}
      />

      {q.isLoading && !d ? (
        <CardSkeleton className="min-h-[200px]" />
      ) : (
        <LiveMoneyHero
          label="Jami hamyon oqimi"
          valueUzs={flowTotal}
          todayDeltaUzs={d?.summary.today_flow}
          icon={Wallet}
          accent="emerald"
          sublabel="To'ldirish + sarf + sovg'a + obuna + qaytarish. Har 8 soniyada yangilanadi."
        />
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {q.isLoading || !d ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KPICard
              label="To'ldirilgan"
              value={formatAdminUzs(d.summary.topup_total)}
              icon={ArrowDownCircle}
              hint={
                d.summary.today_topup
                  ? `Bugun +${formatAdminUzs(d.summary.today_topup)}`
                  : undefined
              }
            />
            <KPICard
              label="To'ldirgan kishilar"
              value={d.summary.topup_users.toLocaleString()}
              icon={Users}
            />
            <KPICard
              label="Sarflangan"
              value={formatAdminUzs(d.summary.spend_total)}
              icon={ArrowUpCircle}
            />
            <KPICard
              label="Sarflagan kishilar"
              value={d.summary.spend_users.toLocaleString()}
            />
            <KPICard
              label="Sovg'alar"
              value={formatAdminUzs(d.summary.gift_total)}
              icon={Gift}
              hint={`${d.summary.gift_count} ta`}
            />
            <KPICard label="Qaytarishlar" value={formatAdminUzs(d.summary.refund_total)} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
                  <span className="text-muted-foreground">
                    {SOURCE_LABELS[row.source] || row.source}
                  </span>
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
                    <span className="text-muted-foreground">
                      {row.label}
                      <span className="ml-2 text-xs">({row.count})</span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatAdminUzs(row.amount)}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground/70"
                      style={{ width: `${(row.amount / maxSpend) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-heading text-lg font-semibold">Kim faol</h2>
              <p className="text-sm text-muted-foreground mt-1">Eng ko&apos;p pul harakati</p>
            </div>
            <LivePulseBadge label="Live" />
          </div>
          {q.isLoading || !d ? (
            <div className="mt-4 h-32 animate-pulse rounded-xl bg-muted/40" />
          ) : !d.top_actors?.length ? (
            <p className="mt-4 text-sm text-muted-foreground">Hali faollik yo&apos;q.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {d.top_actors.slice(0, 6).map((actor) => (
                <li key={actor.user_id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <Link
                      to="/admin/users/$userId"
                      params={{ userId: String(actor.user_id) }}
                      className="font-medium hover:underline truncate block"
                    >
                      {actor.user_name}
                    </Link>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {actor.wallet_number || actor.phone || "—"} · {actor.count} ta
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatAdminUzs(actor.volume)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">Nazorat — so&apos;nggi tranzaksiyalar</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Merchant ID, hamyon, hash — barcha harakatlar kuzatiladi
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Ledger muhri
            {d?.summary.entry_count != null ? (
              <span className="rounded-md bg-muted px-2 py-0.5 font-medium tabular-nums">
                {d.summary.entry_count} yozuv
              </span>
            ) : null}
          </div>
        </div>
        {q.isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : !d || d.recent.length === 0 ? (
          <EmptyState
            title="Tranzaksiya yo'q"
            description="Tanlangan davrda hamyon harakati bo'lmagan."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium sm:px-6">Mijoz / Hamyon</th>
                  <th className="px-4 py-3 font-medium">Tur</th>
                  <th className="px-4 py-3 font-medium text-right">Summa</th>
                  <th className="px-4 py-3 font-medium text-right">Qoldiq</th>
                  <th className="px-4 py-3 font-medium">Merchant TX</th>
                  <th className="px-4 py-3 font-medium">Hash</th>
                  <th className="px-4 py-3 font-medium">Vaqt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.recent.map((row) => {
                  const meta =
                    ENTRY_META[row.entry_type] ?? {
                      label: row.entry_type,
                      className: "bg-muted text-muted-foreground",
                    };
                  const positive = row.amount >= 0;
                  return (
                    <tr key={row.id} className="hover:bg-background/50">
                      <td className="px-4 py-3 sm:px-6">
                        {row.user_id ? (
                          <Link
                            to="/admin/users/$userId"
                            params={{ userId: String(row.user_id) }}
                            className="font-medium hover:underline"
                          >
                            {row.user_name}
                          </Link>
                        ) : (
                          <span className="font-medium">{row.user_name}</span>
                        )}
                        <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                          {row.wallet_number || "—"}
                          {row.user_phone ? ` · ${row.user_phone}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            meta.className,
                          )}
                        >
                          {meta.label}
                        </span>
                        {row.source ? (
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {SOURCE_LABELS[row.source] || row.source}
                          </div>
                        ) : null}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right tabular-nums font-semibold",
                          positive ? "text-emerald-600" : "text-destructive",
                        )}
                      >
                        {positive ? "+" : "−"}
                        {formatAdminUzs(Math.abs(row.amount))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {formatAdminUzs(row.balance_after)}
                      </td>
                      <td className="px-4 py-3">
                        <code className="inline-flex max-w-[140px] items-center gap-1 truncate rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">
                          <Hash className="size-3 shrink-0 opacity-50" />
                          {row.merchant_tx_id || row.id.slice(0, 8)}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-[11px] font-mono text-muted-foreground">
                          {row.entry_hash || "—"}
                        </code>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground whitespace-nowrap">
                        {row.created_at
                          ? format(parseISO(row.created_at), "dd.MM.yyyy HH:mm:ss")
                          : "—"}
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
