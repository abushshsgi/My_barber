import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CreditCard,
  Gift,
  Megaphone,
  Repeat,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { fetchPlatformIncome } from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { useStatsRange, StatsRangePicker } from "@/components/admin/StatisticsShell";

export const Route = createFileRoute("/admin/finance/")({
  component: PlatformIncomePage,
});

const PROVIDER_LABEL: Record<string, string> = {
  wallet: "Hamyon",
  click: "Click",
  payme: "Payme",
  admin: "Admin",
  referral_trial: "Referal",
};

function PlatformIncomePage() {
  const { rangeKey, setRangeKey, range } = useStatsRange("30d");

  const q = useQuery({
    queryKey: ["admin", "platform-income", range.start, range.end],
    queryFn: () => fetchPlatformIncome(range),
    refetchInterval: 15_000,
  });

  const d = q.data;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            Platforma daromadi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            B2B, B2C, sovg&apos;a kartalar, obunalar va boshqa platforma daromadlari.
          </p>
        </div>
        <StatsRangePicker value={rangeKey} onChange={setRangeKey} />
      </div>

      {q.isLoading || !d ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : q.isError ? (
        <EmptyState
          title="Ma'lumot yuklanmadi"
          description="Platforma daromadini yuklab bo'lmadi. Sahifani yangilab ko'ring."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              label="Sof platforma daromadi"
              value={formatAdminUzs(d.summary.platform_net)}
              icon={TrendingUp}
              hint="Dizayn + obuna + reklama + boshqa"
            />
            <KPICard
              label="Marketplace GMV"
              value={formatAdminUzs(d.summary.marketplace_gmv)}
              icon={Wallet}
              hint="Yakunlangan bronlar (naqd + onlayn)"
            />
            <KPICard
              label="B2C onlayn"
              value={formatAdminUzs(d.summary.b2c_online_gmv)}
              icon={CreditCard}
              hint={`${d.b2c.online_count} ta bron`}
            />
            <KPICard
              label="B2B reklamalar"
              value={formatAdminUzs(d.summary.b2b_promotions)}
              icon={Megaphone}
              hint={`${d.b2b.promotions_count} ta`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              label="Sovg'a dizayn"
              value={formatAdminUzs(d.summary.gift_design_fees)}
              icon={Gift}
              hint={`${d.gifts.count} ta sovg'a`}
            />
            <KPICard
              label="B2C obunalar"
              value={formatAdminUzs(d.summary.subscriptions)}
              icon={Repeat}
              hint={`${d.subscriptions.count} ta to'lov`}
            />
            <KPICard
              label="B2C naqd GMV"
              value={formatAdminUzs(d.summary.b2c_cash_gmv)}
              icon={Building2}
              hint={`${d.b2c.cash_count} ta bron`}
            />
            <KPICard
              label="Boshqa"
              value={formatAdminUzs(d.summary.other)}
              icon={Wallet}
              hint={`${d.other.count} ta yozuv`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold">Manbalar bo&apos;yicha</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sof platforma daromadi tarkibi
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {(
                  [
                    {
                      label: "Sovg'a dizayn to'lovlari",
                      value: d.summary.gift_design_fees,
                      to: "/admin/finance/gifts" as const,
                    },
                    {
                      label: "B2C obunalar",
                      value: d.summary.subscriptions,
                      to: "/admin/subscriptions" as const,
                    },
                    {
                      label: "B2B TOP reklamalar",
                      value: d.summary.b2b_promotions,
                      to: "/admin/finance/promotions" as const,
                    },
                    {
                      label: "Boshqa (adjustment)",
                      value: d.summary.other,
                      to: null,
                    },
                  ] as const
                ).map((row) => {
                  const pct =
                    d.summary.platform_net > 0
                      ? Math.round((row.value / d.summary.platform_net) * 100)
                      : 0;
                  const inner = (
                    <>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-foreground">{row.label}</span>
                        <span className="tabular-nums font-semibold">
                          {formatAdminUzs(row.value)}
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-foreground/80"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </>
                  );
                  return row.to ? (
                    <Link
                      key={row.label}
                      to={row.to}
                      className="block rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/40"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div key={row.label} className="rounded-xl border border-border/60 p-3">
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
                <h2 className="font-heading text-lg font-semibold">Sovg&apos;a dizaynlari</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Dizayn bo&apos;yicha yuborilgan sovg&apos;alar
                </p>
                {d.gifts.by_design.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">Bu davrda sovg&apos;a yo&apos;q.</p>
                ) : (
                  <ul className="mt-4 divide-y divide-border">
                    {d.gifts.by_design.map((row) => (
                      <li
                        key={row.design_id}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">{row.design_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.count} ta · sovg&apos;a {formatAdminUzs(row.amount_total)}
                          </div>
                        </div>
                        <span className="shrink-0 tabular-nums font-semibold">
                          {formatAdminUzs(row.fee_total)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  to="/admin/finance/gifts"
                  className="mt-4 inline-flex text-sm font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Barcha sovg&apos;alar →
                </Link>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
                <h2 className="font-heading text-lg font-semibold">Obuna to&apos;lovlari</h2>
                <p className="mt-1 text-sm text-muted-foreground">Provayder bo&apos;yicha</p>
                {d.subscriptions.by_provider.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">Bu davrda to&apos;lov yo&apos;q.</p>
                ) : (
                  <ul className="mt-4 divide-y divide-border">
                    {d.subscriptions.by_provider.map((row) => (
                      <li
                        key={row.provider}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm"
                      >
                        <div>
                          <div className="font-medium">
                            {PROVIDER_LABEL[row.provider] || row.provider}
                          </div>
                          <div className="text-xs text-muted-foreground">{row.count} ta</div>
                        </div>
                        <span className="tabular-nums font-semibold">
                          {formatAdminUzs(row.revenue_uzs)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
