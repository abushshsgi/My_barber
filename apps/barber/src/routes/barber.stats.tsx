import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Users, Star, CalendarClock, TrendingUp, Repeat, Wallet } from "lucide-react";
import { useBarberContext, formatUZS } from "@/components/barber/BarberContext";
import { PageHeader, StatCard, SectionCard, UserAvatar } from "@/components/barber/primitives";
import {
  prefetchBarberAnalytics,
  useBarberAnalyticsQuery,
} from "@/hooks/use-barber-queries";
import { resolveBarberAnalyticsParams } from "@/lib/analytics-scope";
import {
  buildDailyBarChart,
  buildStatsDailyRows,
  isDateInStatsRange,
  statsRangeToIsoParams,
  type StatsRangeKey,
} from "@/lib/finance-range";
import { DailyRevenueChart } from "@/components/barber/DailyRevenueChart";
import { readOnboardingStatusCache } from "@/lib/onboarding-status-cache";

export const Route = createFileRoute("/barber/stats")({
  loader: ({ context: { queryClient } }) => {
    const cached = readOnboardingStatusCache();
    if (cached?.fully_ready !== true) return;
    const dates = statsRangeToIsoParams("30d");
    void prefetchBarberAnalytics(queryClient, dates);
  },
  component: StatsPage,
});

function pickMetric(apiVal: number | null | undefined, localVal: number): number {
  if (apiVal != null && apiVal > 0) return apiVal;
  return localVal;
}

function StatsPage() {
  const { bookings, clients, reviews, fullyReady } = useBarberContext();
  const [range, setRange] = useState<StatsRangeKey>("30d");
  const dates = useMemo(() => statsRangeToIsoParams(range), [range]);
  const analyticsScope = useMemo(() => resolveBarberAnalyticsParams(), []);
  const { data: analytics } = useBarberAnalyticsQuery(
    {
      start: dates.start,
      end: dates.end,
      barberMe: analyticsScope.barberMe,
    },
    fullyReady,
  );

  const bookingsInRange = useMemo(
    () => bookings.filter((b) => b.start_at && isDateInStatsRange(b.start_at, range)),
    [bookings, range],
  );
  const completedInRange = useMemo(
    () => bookingsInRange.filter((b) => b.status === "completed"),
    [bookingsInRange],
  );
  const cancelledInRange = useMemo(
    () => bookingsInRange.filter((b) => b.status === "cancelled").length,
    [bookingsInRange],
  );

  const localCash = completedInRange
    .filter((b) => b.payment_method === "cash")
    .reduce((s, b) => s + b.price, 0);
  const localOnline = completedInRange
    .filter((b) => b.payment_method === "online")
    .reduce((s, b) => s + b.price, 0);
  const localRevenue = completedInRange.reduce((s, b) => s + b.price, 0);

  const totalRevenue = pickMetric(
    analytics?.revenue != null ? Number(analytics.revenue) : null,
    localRevenue,
  );
  const cashTotal = pickMetric(
    analytics?.cash_total != null ? Number(analytics.cash_total) : null,
    localCash,
  );
  const onlineTotal = pickMetric(
    analytics?.online_total != null ? Number(analytics.online_total) : null,
    localOnline,
  );

  const completedCount =
    analytics?.completed_count && analytics.completed_count > 0
      ? analytics.completed_count
      : completedInRange.length;
  const cancelledCount =
    analytics?.cancelled_count != null && analytics.cancelled_count > 0
      ? analytics.cancelled_count
      : cancelledInRange;
  const completionRate =
    completedCount + cancelledCount > 0
      ? (completedCount / Math.max(1, completedCount + cancelledCount)) * 100
      : 0;

  const avgTicket =
    totalRevenue > 0 ? totalRevenue / Math.max(1, completedCount) : 0;

  const repeatRate =
    analytics?.unique_clients
      ? ((analytics.returning_clients ?? 0) / Math.max(1, analytics.unique_clients)) * 100
      : clients.length > 0
        ? (clients.filter((c) => c.visits >= 2).length / clients.length) * 100
        : 0;
  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / Math.max(1, reviews.length);

  const topServices = analytics?.top_services?.length
    ? analytics.top_services.map((s) => ({ name: s.service_name, count: s.cnt }))
    : Object.entries(
        completedInRange.reduce<Record<string, number>>((acc, b) => {
          acc[b.service] = (acc[b.service] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
  const maxCount = Math.max(1, ...topServices.map((s) => s.count));
  const topClients = [...clients].sort((a, b) => b.spent - a.spent).slice(0, 5);

  const dailyRows = useMemo(
    () => buildStatsDailyRows(analytics?.daily ?? [], completedInRange, range),
    [analytics?.daily, completedInRange, range],
  );
  const dailyChart = useMemo(() => buildDailyBarChart(dailyRows), [dailyRows]);

  const cashCount =
    analytics?.cash_count && analytics.cash_count > 0
      ? analytics.cash_count
      : completedInRange.filter((b) => b.payment_method === "cash").length;
  const onlineCount =
    analytics?.online_count && analytics.online_count > 0
      ? analytics.online_count
      : completedInRange.filter((b) => b.payment_method === "online").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Statistika"
        description="Ish samaradorligingiz va ko'rsatkichlar."
        actions={
          <div className="inline-flex gap-1 bg-muted p-1 rounded-lg">
            {(["7d", "30d", "90d"] as StatsRangeKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setRange(k)}
                className={`px-3 py-1.5 rounded-md text-sm ${
                  range === k ? "bg-background font-medium shadow-card" : "text-muted-foreground"
                }`}
              >
                {k === "7d" ? "7 kun" : k === "30d" ? "30 kun" : "90 kun"}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="Jami daromad"
          value={formatUZS(totalRevenue)}
          hint="Naqd + onlayn"
        />
        <StatCard
          icon={<Wallet className="size-4" />}
          label="Naqd"
          value={formatUZS(cashTotal)}
          hint={`${cashCount} ta bron`}
        />
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="Onlayn"
          value={formatUZS(onlineTotal)}
          hint={`${onlineCount} ta bron`}
        />
        <StatCard
          icon={<CalendarClock className="size-4" />}
          label="O'rt. chek"
          value={formatUZS(avgTicket)}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="Bronlarni yakunlash"
          value={`${completionRate.toFixed(0)}%`}
        />
        <StatCard
          icon={<Repeat className="size-4" />}
          label="Qaytuvchi mijoz"
          value={`${repeatRate.toFixed(0)}%`}
        />
        <StatCard
          icon={<Star className="size-4" />}
          label="O'rt. reyting"
          value={avgRating.toFixed(1)}
          hint={`${reviews.length} sharh`}
        />
        <StatCard
          icon={<Users className="size-4" />}
          label="Noyob mijozlar"
          value={
            analytics?.unique_clients
              ? String(analytics.unique_clients)
              : String(clients.length)
          }
          hint={
            analytics?.new_clients != null
              ? `${analytics.new_clients} yangi`
              : `${clients.filter((c) => c.visits <= 1).length} yangi`
          }
        />
      </div>

      <SectionCard title="Kunlik savdo" description="Tanlangan davr bo'yicha">
        <DailyRevenueChart items={dailyChart.items} />
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Eng mashhur xizmatlar" description="Bronlar bo'yicha">
          <div className="space-y-3">
            {topServices.map((s) => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground">{s.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-foreground"
                    style={{ width: `${(s.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {topServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ma&apos;lumot yo&apos;q.</p>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="VIP mijozlar" description="Sarflagan summa bo'yicha">
          <div className="space-y-3">
            {topClients.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <div className="size-7 rounded-full bg-muted text-foreground text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </div>
                <UserAvatar src={c.avatar} name={c.name} className="size-9" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.visits} ta tashrif</div>
                </div>
                <div className="text-sm font-medium">{formatUZS(c.spent)}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
