import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Gift, Sparkles, Store, Scissors } from "lucide-react";
import { fetchAdminGiftDesigns } from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { LiveMoneyHero } from "@/components/admin/LiveMoneyHero";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { LivePulseBadge } from "@/components/admin/LiveMetricHero";
import { Button } from "@/components/ui/button";
import { useStatsRange, StatsRangePicker } from "@/components/admin/StatisticsShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/finance/gift-designs")({
  component: AdminGiftDesignsPage,
});

const COLLECTION_STYLE: Record<string, string> = {
  Asosiy: "bg-slate-500/10 text-slate-800",
  Standart: "bg-sky-500/10 text-sky-800",
  Premium: "bg-amber-500/10 text-amber-900",
};

function AdminGiftDesignsPage() {
  const { rangeKey, setRangeKey, range } = useStatsRange("90d");

  const q = useQuery({
    queryKey: ["admin", "gift-designs", range.start, range.end],
    queryFn: () => fetchAdminGiftDesigns(range),
    refetchInterval: 12_000,
    refetchIntervalInBackground: true,
  });

  const d = q.data;
  const maxSales = Math.max(1, ...(d?.designs.map((x) => x.sales_count) ?? [1]));
  const maxSalon = Math.max(1, ...(d?.spend_by_salon.map((x) => x.amount) ?? [1]));
  const maxService = Math.max(1, ...(d?.spend_by_service.map((x) => x.amount) ?? [1]));

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
            <Link to="/admin/finance/gifts">
              <ArrowLeft className="size-4" />
              Sovg&apos;a oqimi
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              Sovg&apos;a karta dizaynlari
            </h1>
            <LivePulseBadge label="Stats" />
          </div>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Kolleksiya, narxlar, qaysi dizayn ko&apos;proq sotiladi va sovg&apos;a pullari
            qayerga sarflanadi.
          </p>
        </div>
        <StatsRangePicker value={rangeKey} onChange={setRangeKey} />
      </div>

      {q.isError ? (
        <EmptyState title="Yuklanmadi" description="Dizayn statistikasini olishning iloji bo'lmadi." />
      ) : (
        <>
          {q.isLoading && !d ? (
            <CardSkeleton className="min-h-[180px]" />
          ) : (
            <LiveMoneyHero
              label="Dizayn daromadi"
              valueUzs={d?.summary.design_fee_total ?? 0}
              todayDeltaUzs={d?.summary.today_amount}
              icon={Sparkles}
              accent="amber"
              sublabel={
                d?.summary.top_design_name
                  ? `Eng mashhur: ${d.summary.top_design_name} · ${d.summary.designs_count} ta dizayn katalogda`
                  : `${d?.summary.designs_count ?? 0} ta dizayn katalogda`
              }
            />
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {!d ? (
              Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              <>
                <KPICard label="Sotuvlar" value={d.summary.count} icon={Gift} />
                <KPICard
                  label="Sovg'a summasi"
                  value={formatAdminUzs(d.summary.amount_total)}
                />
                <KPICard
                  label="Jami yechilgan"
                  value={formatAdminUzs(d.summary.charged_total)}
                />
                <KPICard
                  label="Top dizayn"
                  value={d.summary.top_design_name || "—"}
                />
              </>
            )}
          </div>

          <section>
            <h2 className="font-heading text-lg font-semibold">Katalog va sotuv</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Har bir dizayn narxi, kolleksiyasi va necha marta xarid qilingani
            </p>
            {!d ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <CardSkeleton key={i} className="min-h-[200px]" />
                ))}
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {d.designs.map((design) => (
                  <article
                    key={design.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
                  >
                    <div
                      className="relative h-28"
                      style={{
                        background: `linear-gradient(135deg, ${design.preview?.from || "#222"}, ${design.preview?.to || "#111"})`,
                      }}
                    >
                      <div className="absolute inset-0 flex items-end justify-between p-3">
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                            COLLECTION_STYLE[design.collection] || "bg-white/20 text-white",
                          )}
                        >
                          {design.collection}
                        </span>
                        <span className="rounded-md bg-black/40 px-2 py-0.5 text-[11px] font-medium text-white tabular-nums">
                          {formatAdminUzs(design.fee)}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-heading font-semibold">{design.name_uz}</h3>
                      <p className="text-xs text-muted-foreground">{design.name}</p>
                      <div className="mt-3 flex items-end justify-between gap-2">
                        <div>
                          <p className="text-2xl font-bold tabular-nums">{design.sales_count}</p>
                          <p className="text-[11px] text-muted-foreground">sotuv</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{design.unique_senders} yuboruvchi</p>
                          <p>{design.unique_recipients} qabul</p>
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-amber-500/80"
                          style={{ width: `${(design.sales_count / maxSales) * 100}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Sovg&apos;a jami {formatAdminUzs(design.gift_amount_total)} · fee{" "}
                        {formatAdminUzs(design.fee_total)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
              <div className="flex items-center gap-2">
                <Store className="size-5 text-muted-foreground" />
                <h2 className="font-heading text-lg font-semibold">Salonlarga sarf</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Sovg&apos;a olganlar qaysi salonlarda hamyon bilan to&apos;lagan
              </p>
              {!d ? (
                <div className="mt-4 h-40 animate-pulse rounded-xl bg-muted/40" />
              ) : d.spend_by_salon.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Hali sarf yo&apos;q.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {d.spend_by_salon.map((row) => (
                    <li key={row.salon_name}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-medium">{row.salon_name}</span>
                        <span className="tabular-nums font-semibold">
                          {formatAdminUzs(row.amount)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-foreground/60"
                          style={{ width: `${(row.amount / maxSalon) * 100}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{row.count} ta to&apos;lov</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
              <div className="flex items-center gap-2">
                <Scissors className="size-5 text-muted-foreground" />
                <h2 className="font-heading text-lg font-semibold">Xizmatlarga sarf</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Qaysi xizmatlar sovg&apos;a pullari bilan eng ko&apos;p to&apos;lanadi
              </p>
              {!d ? (
                <div className="mt-4 h-40 animate-pulse rounded-xl bg-muted/40" />
              ) : d.spend_by_service.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Hali sarf yo&apos;q.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {d.spend_by_service.map((row) => (
                    <li key={row.service_name}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-medium">{row.service_name}</span>
                        <span className="tabular-nums font-semibold">
                          {formatAdminUzs(row.amount)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-amber-500/70"
                          style={{ width: `${(row.amount / maxService) * 100}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{row.count} ta</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
