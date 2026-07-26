import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Banknote,
  Building2,
  CalendarClock,
  CreditCard,
  Scissors,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  downloadStatisticsCsv,
  fetchPlatformLiveStats,
  fetchPlatformOverview,
} from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton } from "@/components/admin/Skeletons";
import {
  StatsPageHeader,
  useStatsRange,
} from "@/components/admin/StatisticsShell";
import { CombinedSignupAreaChart } from "@/components/admin/StatsCharts";
import { LivePulseBadge } from "@/components/admin/LiveMetricHero";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/statistics/")({
  component: StatisticsOverviewPage,
});

function StatisticsOverviewPage() {
  const { rangeKey, setRangeKey, range } = useStatsRange("30d");

  const q = useQuery({
    queryKey: ["admin", "stats-overview", range.start, range.end],
    queryFn: () => fetchPlatformOverview(range),
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });

  const liveQ = useQuery({
    queryKey: ["admin", "stats-live-mini"],
    queryFn: () => fetchPlatformLiveStats(20),
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });

  const d = q.data;
  const cashPct =
    d && d.revenue.gmv > 0 ? Math.round((d.revenue.cash_total / d.revenue.gmv) * 100) : 0;
  const onlinePct = d && d.revenue.gmv > 0 ? 100 - cashPct : 0;

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Umumiy statistika"
        description="Platforma bo'yicha B2B va B2C ko'rsatkichlar — real vaqtda (10 soniyada yangilanadi)."
        rangeKey={rangeKey}
        onRangeChange={setRangeKey}
        onExport={() => downloadStatisticsCsv("overview", { range })}
      >
        <Link
          to="/admin/statistics/live"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow-card transition-colors hover:bg-muted"
        >
          <LivePulseBadge label="Live" />
        </Link>
      </StatsPageHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {q.isLoading || !d ? (
          <>
            <CardSkeleton className="min-h-[168px]" />
            <CardSkeleton className="min-h-[168px]" />
          </>
        ) : (
          <>
            <KPICard
              size="hero"
              label="Jami daromad (GMV)"
              value={formatAdminUzs(d.revenue.gmv)}
              icon={TrendingUp}
              hint={`Naqd ${formatAdminUzs(d.revenue.cash_total)} · Onlayn ${formatAdminUzs(d.revenue.online_total)}`}
              className="bg-gradient-to-br from-card to-emerald-500/5"
            />
            <KPICard
              size="hero"
              label="Jami bronlar"
              value={d.b2c.total_bookings.toLocaleString()}
              icon={CalendarClock}
              hint={`Yakunlangan ${d.b2c.completed_bookings} · Muvaffaqiyat ${d.b2c.success_rate}%`}
              className="bg-gradient-to-br from-card to-blue-500/5"
            />
          </>
        )}
      </div>

      {q.isLoading || !d ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              B2C — Mijozlar
            </p>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
              <KPICard label="Jami mijozlar" value={d.b2c.clients_total.toLocaleString()} icon={Users} />
              <KPICard label="Faol mijozlar" value={d.b2c.active_clients.toLocaleString()} icon={Activity} />
              <KPICard label="Yakunlangan" value={d.b2c.completed_bookings.toLocaleString()} />
              <KPICard label="Bekor qilingan" value={d.b2c.cancelled_bookings.toLocaleString()} />
              <KPICard label="Naqd to'lov" value={d.b2c.cash_count.toLocaleString()} icon={Banknote} />
              <KPICard label="Onlayn to'lov" value={d.b2c.online_count.toLocaleString()} icon={CreditCard} />
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              B2B — Sartarosh va salonlar
            </p>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
              <KPICard label="Jami sartarosh" value={d.b2b.barbers_total.toLocaleString()} icon={Scissors} />
              <KPICard label="Mustaqil" value={d.b2b.barbers_independent.toLocaleString()} />
              <KPICard label="Salon egasi" value={d.b2b.barbers_salon_owner.toLocaleString()} />
              <KPICard label="Salonga qo'shilgan" value={d.b2b.barbers_salon_employee.toLocaleString()} />
              <KPICard label="Jami salon" value={d.b2b.salons_total.toLocaleString()} icon={Building2} />
              <KPICard label="Kutilayotgan to'lov" value={formatAdminUzs(d.b2b.pending_payouts)} />
            </div>
          </div>

          {d.agents && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Sotuv agentlari
                </p>
                <Link to="/admin/statistics/agents" className="text-sm font-semibold hover:underline">
                  Batafsil →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
                <KPICard label="Agentlar" value={(d.agents.agents_total ?? 0).toLocaleString()} icon={Users} />
                <KPICard label="Faol" value={(d.agents.agents_active ?? 0).toLocaleString()} />
                <KPICard
                  label="Salonlar"
                  value={(d.agents.salons_referred ?? 0).toLocaleString()}
                  icon={Building2}
                />
                <KPICard label="Trialda" value={(d.agents.salons_trial ?? 0).toLocaleString()} />
                <KPICard
                  label="Barberlar"
                  value={(d.agents.barbers_referred ?? 0).toLocaleString()}
                  icon={Scissors}
                />
                <KPICard
                  label="Davrdagi yangi"
                  value={(d.agents.salons_in_range ?? 0).toLocaleString()}
                  hint="Tanlangan oralik"
                />
              </div>
            </div>
          )}

          <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6">
            <h2 className="font-heading text-lg font-semibold">To'lov usullari nisbati</h2>
            <p className="text-sm text-muted-foreground mt-1">Yakunlangan bronlar bo'yicha naqd va onlayn</p>
            <div className="mt-5 h-4 w-full overflow-hidden rounded-full bg-muted">
              <div className="flex h-full">
                <div className="bg-emerald-500/80 transition-all duration-700" style={{ width: `${cashPct}%` }} />
                <div className="bg-blue-500/80 transition-all duration-700" style={{ width: `${onlinePct}%` }} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-emerald-500/80" />
                <span className="text-muted-foreground">Naqd</span>
                <span className="font-semibold">{formatAdminUzs(d.revenue.cash_total)}</span>
                <span className="text-muted-foreground">({cashPct}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-blue-500/80" />
                <span className="text-muted-foreground">Onlayn</span>
                <span className="font-semibold">{formatAdminUzs(d.revenue.online_total)}</span>
                <span className="text-muted-foreground">({onlinePct}%)</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold">Ro'yxatdan o'tish trendi</h2>
                <p className="text-sm text-muted-foreground mt-1">So'nggi 7 kun — mijoz, sartarosh, salon</p>
              </div>
              <Link to="/admin/statistics/live" className="text-sm font-semibold text-primary hover:underline">
                Real vaqt →
              </Link>
            </div>
            {liveQ.isLoading || !liveQ.data ? (
              <div className="mt-6 h-56 animate-pulse rounded-xl bg-muted/40" />
            ) : (
              <div className="mt-4">
                <CombinedSignupAreaChart data={liveQ.data.combinedDaily} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
