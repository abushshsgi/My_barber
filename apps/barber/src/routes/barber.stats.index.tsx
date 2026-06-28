import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Users, Star, CalendarClock, TrendingUp, Repeat, Wallet } from "lucide-react";
import { useBarberContext, formatUZS } from "@/components/barber/BarberContext";
import { PageHeader, StatCard, SectionCard, UserAvatar } from "@/components/barber/primitives";
import { DailyRevenueChart } from "@/components/barber/DailyRevenueChart";
import { StatsRangePicker, StatsSectionTabs } from "@/components/barber/StatsSectionNav";
import { useBarberStatsMetrics } from "@/hooks/use-barber-stats";
import type { StatsRangeKey } from "@/lib/finance-range";

export const Route = createFileRoute("/barber/stats/")({
  component: StatsPage,
});

function StatsPage() {
  const { clients, reviews } = useBarberContext();
  const [range, setRange] = useState<StatsRangeKey>("30d");
  const metrics = useBarberStatsMetrics(range);
  const {
    analytics,
    dailyChart,
    totalRevenue,
    cashTotal,
    onlineTotal,
    cashCount,
    onlineCount,
    completionRate,
    repeatRate,
    avgTicket,
    avgRating,
    topServices,
  } = metrics;

  const maxCount = Math.max(1, ...topServices.map((s) => s.count));
  const topClients = [...clients].sort((a, b) => b.spent - a.spent).slice(0, 5);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Statistika"
        description="Ish samaradorligingiz va ko'rsatkichlar."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatsSectionTabs />
            <StatsRangePicker range={range} onChange={setRange} />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
        <DailyRevenueChart items={dailyChart.items} tickInterval={dailyChart.tickInterval} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Eng mashhur xizmatlar" description="Bronlar bo'yicha">
          <div className="space-y-3">
            {topServices.map((s) => (
              <div key={s.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground">{s.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
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
                <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                  {i + 1}
                </div>
                <UserAvatar src={c.avatar} name={c.name} className="size-9" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{c.name}</div>
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
