import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Gift, Megaphone, Repeat, TrendingUp, Wallet } from "lucide-react";
import { fetchPlatformIncome } from "@/lib/admin-api";
import { formatAdminUzs, formatAdminUzsFull } from "@/lib/admin-analytics";
import { LiveMoneyHero } from "@/components/admin/LiveMoneyHero";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { useStatsRange, StatsRangePicker } from "@/components/admin/StatisticsShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/finance/")({
  component: PlatformIncomePage,
});

const KIND_META: Record<string, { label: string; className: string }> = {
  gift_design: { label: "Sovg'a", className: "bg-violet-500/10 text-violet-800" },
  subscription: { label: "Obuna", className: "bg-sky-500/10 text-sky-800" },
  promotion: { label: "Reklama", className: "bg-amber-500/10 text-amber-900" },
  other: { label: "Boshqa", className: "bg-muted text-muted-foreground" },
};

const SOURCE_LINK: Record<string, string | null> = {
  gift_design: "/admin/finance/gifts",
  subscriptions: "/admin/subscriptions",
  promotions: "/admin/finance/promotions",
  other: null,
};

function PlatformIncomePage() {
  const { rangeKey, setRangeKey, range } = useStatsRange("30d");

  const q = useQuery({
    queryKey: ["admin", "platform-income", range.start, range.end],
    queryFn: () => fetchPlatformIncome(range),
    refetchInterval: 8_000,
    refetchIntervalInBackground: true,
  });

  const d = q.data;
  const net = d?.summary.platform_net ?? 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            Platforma daromadi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Faqat platforma olgan sof daromad — aylanma emas. Kimdan va nimadan kelgani.
          </p>
        </div>
        <StatsRangePicker value={rangeKey} onChange={setRangeKey} />
      </div>

      {q.isError ? (
        <EmptyState
          title="Ma'lumot yuklanmadi"
          description="Platforma daromadini yuklab bo'lmadi."
        />
      ) : (
        <>
          {q.isLoading && !d ? (
            <CardSkeleton className="min-h-[200px]" />
          ) : (
            <LiveMoneyHero
              label="Sof platforma daromadi"
              valueUzs={net}
              todayDeltaUzs={d?.summary.today_net}
              icon={TrendingUp}
              accent="emerald"
              sublabel="Sovg'a dizayn + obuna + TOP reklama + boshqa. 8 soniyada yangilanadi."
            />
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
              <h2 className="font-heading text-lg font-semibold">Daromad manbalari</h2>
              <p className="mt-1 text-sm text-muted-foreground">Ulush va summa</p>
              {!d ? (
                <div className="mt-6 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/50" />
                  ))}
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {d.sources.map((row) => {
                    const pct = net > 0 ? Math.round((row.amount / net) * 100) : 0;
                    const to = SOURCE_LINK[row.key];
                    const body = (
                      <>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <div>
                            <div className="font-medium text-foreground">{row.label}</div>
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
                            className="h-full rounded-full bg-emerald-600/80 transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </>
                    );
                    return to ? (
                      <Link
                        key={row.key}
                        to={to}
                        className="block rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/40"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div key={row.key} className="rounded-xl border border-border/60 p-3">
                        {body}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
              <h2 className="font-heading text-lg font-semibold">So&apos;nggi tushumlar</h2>
              <p className="mt-1 text-sm text-muted-foreground">Kimdan qancha kelgani</p>
              {!d ? (
                <div className="mt-6 h-64 animate-pulse rounded-xl bg-muted/40" />
              ) : d.recent.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">Bu davrda tushum yo&apos;q.</p>
              ) : (
                <ul className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {d.recent.map((ev) => {
                    const meta = KIND_META[ev.kind] ?? KIND_META.other;
                    return (
                      <li
                        key={ev.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-border/50 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                meta.className,
                              )}
                            >
                              {meta.label}
                            </span>
                            <span className="truncate text-sm font-medium">{ev.payer_name}</span>
                          </div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {ev.label}
                            {ev.created_at
                              ? ` · ${format(new Date(ev.created_at), "dd MMM HH:mm")}`
                              : ""}
                          </div>
                        </div>
                        <span className="shrink-0 tabular-nums text-sm font-semibold text-emerald-700">
                          +{formatAdminUzs(ev.amount)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {d && d.gifts.by_design.length > 0 ? (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold">Sovg&apos;a dizayn bo&apos;yicha</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Platforma dizayn to&apos;lovlari</p>
                </div>
                <Gift className="size-5 text-muted-foreground" />
              </div>
              <ul className="mt-4 divide-y divide-border">
                {d.gifts.by_design.map((row) => (
                  <li
                    key={row.design_id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <div>
                      <div className="font-medium">{row.design_name}</div>
                      <div className="text-xs text-muted-foreground">{row.count} ta</div>
                    </div>
                    <span className="tabular-nums font-semibold">
                      {formatAdminUzsFull(row.fee_total)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {d ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Link
                to="/admin/subscriptions"
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:bg-muted/40"
              >
                <Repeat className="size-5 text-sky-600" />
                <div>
                  <div className="text-sm font-medium">Obunalar</div>
                  <div className="text-xs text-muted-foreground">
                    {formatAdminUzs(d.summary.subscriptions)}
                  </div>
                </div>
              </Link>
              <Link
                to="/admin/finance/promotions"
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:bg-muted/40"
              >
                <Megaphone className="size-5 text-amber-600" />
                <div>
                  <div className="text-sm font-medium">TOP reklamalar</div>
                  <div className="text-xs text-muted-foreground">
                    {formatAdminUzs(d.summary.b2b_promotions)}
                  </div>
                </div>
              </Link>
              <Link
                to="/admin/finance/gifts"
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:bg-muted/40"
              >
                <Wallet className="size-5 text-violet-600" />
                <div>
                  <div className="text-sm font-medium">Sovg&apos;a kartalar</div>
                  <div className="text-xs text-muted-foreground">
                    {formatAdminUzs(d.summary.gift_design_fees)}
                  </div>
                </div>
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
