import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Gift,
  Scissors,
  Users,
  Wallet,
} from "lucide-react";
import { fetchPlatformTurnover } from "@/lib/admin-api";
import { formatAdminUzs, formatAdminUzsFull } from "@/lib/admin-analytics";
import { LiveMoneyHero } from "@/components/admin/LiveMoneyHero";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { useStatsRange, StatsRangePicker } from "@/components/admin/StatisticsShell";

export const Route = createFileRoute("/admin/aylanma/")({
  component: AylanmaPage,
});

const TOPUP_LABEL: Record<string, string> = {
  card_manual: "Karta",
  admin_topup: "Admin",
  debug_topup: "Test",
  click_checkout: "Click",
  payme_checkout: "Payme",
  unknown: "Noma'lum",
};

function AylanmaPage() {
  const { rangeKey, setRangeKey, range } = useStatsRange("30d");

  const q = useQuery({
    queryKey: ["admin", "platform-turnover", range.start, range.end],
    queryFn: () => fetchPlatformTurnover(range),
    refetchInterval: 8_000,
    refetchIntervalInBackground: true,
  });

  const d = q.data;
  const total = d?.summary.total_turnover ?? 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            Platforma aylanmasi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            B2B bron to&apos;lovlari va mijozlar pul oqimi — sof daromad emas, aylanma.
          </p>
        </div>
        <StatsRangePicker value={rangeKey} onChange={setRangeKey} />
      </div>

      {q.isError ? (
        <EmptyState title="Yuklanmadi" description="Aylanma ma'lumotini olishning iloji bo'lmadi." />
      ) : (
        <>
          {q.isLoading && !d ? (
            <CardSkeleton className="min-h-[200px]" />
          ) : (
            <LiveMoneyHero
              label="Jami aylanma"
              valueUzs={total}
              todayDeltaUzs={d?.summary.today_turnover}
              icon={ArrowLeftRight}
              accent="blue"
              sublabel="Bronlar (naqd+onlayn) + mijoz to'ldirish + sovg'a o'tkazmalari. Real vaqtda yangilanadi."
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {!d ? (
              Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              <>
                <KPICard
                  label="B2B bronlar"
                  value={formatAdminUzs(d.summary.booking_gmv)}
                  icon={Scissors}
                  hint={`${d.b2b.completed_count} ta yakunlangan`}
                />
                <KPICard
                  label="Naqd"
                  value={formatAdminUzs(d.summary.cash_gmv)}
                  icon={Banknote}
                  hint={`${d.b2b.cash_count} ta`}
                />
                <KPICard
                  label="Onlayn"
                  value={formatAdminUzs(d.summary.online_gmv)}
                  icon={CreditCard}
                  hint={`${d.b2b.online_count} ta`}
                />
                <KPICard
                  label="Mijoz to'ldirish"
                  value={formatAdminUzs(d.summary.topup_total)}
                  icon={Wallet}
                  hint={`${d.b2c.topup_count} ta`}
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
              <div className="flex items-center gap-2">
                <Scissors className="size-5 text-muted-foreground" />
                <h2 className="font-heading text-lg font-semibold">B2B — sartaroshlar</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Bronlardan kelgan to&apos;lovlar (naqd va onlayn)
              </p>
              {!d ? (
                <div className="mt-6 h-40 animate-pulse rounded-xl bg-muted/40" />
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-border/60 p-4">
                    <div className="text-xs text-muted-foreground">Jami B2B</div>
                    <div className="mt-1 font-heading text-2xl font-bold tabular-nums">
                      {formatAdminUzsFull(d.b2b.total)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-muted/40 p-4">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Banknote className="size-3.5" /> Naqd
                      </div>
                      <div className="mt-2 text-lg font-semibold tabular-nums">
                        {formatAdminUzs(d.b2b.cash_total)}
                      </div>
                      <div className="text-xs text-muted-foreground">{d.b2b.cash_count} ta bron</div>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-4">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CreditCard className="size-3.5" /> Onlayn
                      </div>
                      <div className="mt-2 text-lg font-semibold tabular-nums">
                        {formatAdminUzs(d.b2b.online_total)}
                      </div>
                      <div className="text-xs text-muted-foreground">{d.b2b.online_count} ta bron</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-muted-foreground" />
                <h2 className="font-heading text-lg font-semibold">B2C — mijozlar</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                To&apos;ldirish, sovg&apos;a va hamyon orqali bron to&apos;lovi
              </p>
              {!d ? (
                <div className="mt-6 h-40 animate-pulse rounded-xl bg-muted/40" />
              ) : (
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Wallet className="size-4 text-muted-foreground" />
                      To&apos;ldirishlar
                    </div>
                    <div className="text-right">
                      <div className="tabular-nums font-semibold">
                        {formatAdminUzsFull(d.b2c.topup_total)}
                      </div>
                      <div className="text-xs text-muted-foreground">{d.b2c.topup_count} ta</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Gift className="size-4 text-muted-foreground" />
                      Sovg&apos;a o&apos;tkazmalari
                    </div>
                    <div className="text-right">
                      <div className="tabular-nums font-semibold">
                        {formatAdminUzsFull(d.b2c.gift_amount_total)}
                      </div>
                      <div className="text-xs text-muted-foreground">{d.b2c.gift_count} ta</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="size-4 text-muted-foreground" />
                      Hamyondan bron
                    </div>
                    <div className="text-right">
                      <div className="tabular-nums font-semibold">
                        {formatAdminUzsFull(d.b2c.wallet_booking_spend)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {d.b2c.wallet_booking_count} ta
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
            <h2 className="font-heading text-lg font-semibold">Aylanma tarkibi</h2>
            <p className="mt-1 text-sm text-muted-foreground">Nimalardan kelgani</p>
            {!d ? (
              <div className="mt-6 h-40 animate-pulse rounded-xl bg-muted/40" />
            ) : (
              <div className="mt-5 space-y-3">
                {d.streams.map((row) => {
                  const pct = total > 0 ? Math.round((row.amount / total) * 100) : 0;
                  return (
                    <div key={row.key} className="rounded-xl border border-border/60 p-3">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div>
                          <div className="font-medium">{row.label}</div>
                          <div className="text-xs text-muted-foreground">{row.count} ta</div>
                        </div>
                        <div className="text-right">
                          <div className="tabular-nums font-semibold">
                            {formatAdminUzsFull(row.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">{pct}%</div>
                        </div>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-blue-600/80 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {d && d.b2c.topup_sources.length > 0 ? (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
              <h2 className="font-heading text-lg font-semibold">To&apos;ldirish manbalari</h2>
              <ul className="mt-4 divide-y divide-border">
                {d.b2c.topup_sources.map((row) => (
                  <li
                    key={row.source}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <div>
                      <div className="font-medium">
                        {TOPUP_LABEL[row.source] || row.source}
                      </div>
                      <div className="text-xs text-muted-foreground">{row.count} ta</div>
                    </div>
                    <span className="tabular-nums font-semibold">
                      {formatAdminUzsFull(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
