import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CalendarClock,
  Repeat,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { AdminDailyRevenueChart } from "@/components/admin/AdminDailyRevenueChart";
import {
  AdminSalonStatsNav,
  AdminStatsRangePicker,
} from "@/components/admin/AdminSalonStatsNav";
import { KPICard } from "@/components/admin/KPICard";
import { formatAdminUzs, type StatsRangeKey } from "@/lib/admin-analytics";
import { useAdminSalonStatsMetrics } from "@/hooks/use-admin-salon-stats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/admin/salons/$salonId/stats/")({
  component: AdminSalonStatsPage,
});

function AdminSalonStatsPage() {
  const { salonId } = Route.useParams();
  const [range, setRange] = useState<StatsRangeKey>("30d");
  const metrics = useAdminSalonStatsMetrics(salonId, range);

  const maxCount = Math.max(1, ...metrics.topServices.map((s) => s.count));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold">Statistika</h2>
          <p className="text-sm text-muted-foreground">
            MySalon orqali ochilgan salon — bronlar, daromad va mijozlar
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminSalonStatsNav salonId={salonId} />
          <AdminStatsRangePicker range={range} onChange={setRange} />
        </div>
      </div>

      {metrics.isLoading && !metrics.dailyChart.hasData ? (
        <p className="text-sm text-muted-foreground">Statistika yuklanmoqda…</p>
      ) : null}

      {metrics.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Analitika yuklanmadi.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard
          label="Jami daromad"
          value={formatAdminUzs(metrics.totalRevenue)}
          hint="Naqd + onlayn"
          icon={Wallet}
        />
        <KPICard
          label="Naqd"
          value={formatAdminUzs(metrics.cashTotal)}
          hint={`${metrics.cashCount} ta bron`}
          icon={TrendingUp}
        />
        <KPICard
          label="Onlayn"
          value={formatAdminUzs(metrics.onlineTotal)}
          hint={`${metrics.onlineCount} ta bron`}
          icon={TrendingUp}
        />
        <KPICard
          label="O'rt. chek"
          value={formatAdminUzs(metrics.avgTicket)}
          icon={CalendarClock}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard
          label="Yakunlash"
          value={`${metrics.completionRate.toFixed(0)}%`}
          icon={TrendingUp}
        />
        <KPICard
          label="Qaytuvchi mijoz"
          value={`${metrics.repeatRate.toFixed(0)}%`}
          icon={Repeat}
        />
        <KPICard
          label="Yakunlangan"
          value={String(metrics.completedCount)}
          hint={`${metrics.cancelledCount} bekor`}
          icon={CalendarClock}
        />
        <KPICard
          label="Noyob mijozlar"
          value={String(metrics.analytics?.unique_clients ?? 0)}
          hint={`${metrics.analytics?.new_clients ?? 0} yangi`}
          icon={Users}
        />
      </div>

      <Card className="rounded-2xl border-border shadow-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Kunlik savdo</CardTitle>
          <CardDescription>Tanlangan davr bo&apos;yicha</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminDailyRevenueChart
            items={metrics.dailyChart.items}
            tickInterval={metrics.dailyChart.tickInterval}
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Eng mashhur xizmatlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.topServices.map((s) => (
            <div key={s.name}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground">{s.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-foreground rounded-full"
                  style={{ width: `${(s.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {metrics.topServices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ma&apos;lumot yo&apos;q.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
