import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fetchAdminStats, fetchAdminBookings } from "@/lib/admin-api";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
});

function formatUZS(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M so'm`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K so'm`;
  return `${n} so'm`;
}

function DashboardPage() {
  const statsQ = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchAdminStats,
  });

  const bookingsQ = useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: () => fetchAdminBookings(),
  });

  const stats = statsQ.data;
  const recentBookings = (bookingsQ.data ?? []).slice(0, 6);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tarmoq bo'yicha umumiy ko'rinish va so'nggi faollik.
          </p>
        </div>
        <Button>
          <Download className="size-4 mr-2" />
          Hisobot olish
        </Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statsQ.isLoading || !stats ? (
          Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KPICard
              label="Jami mijozlar"
              value={stats.total_users.toLocaleString()}
              delta={stats.delta.users}
            />
            <KPICard
              label="Faol sartaroshlar"
              value={stats.total_barbers.toLocaleString()}
              delta={stats.delta.barbers}
            />
            <KPICard label="Salonlar" value={stats.total_salons.toLocaleString()} hint="Hamkor" />
            <KPICard
              label="Haftalik bronlar"
              value={stats.weekly_bookings.toLocaleString()}
              delta={stats.delta.bookings}
            />
            <KPICard
              label="Daromad"
              value={formatUZS(stats.revenue_uzs)}
              delta={stats.delta.revenue}
            />
          </>
        )}
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-card overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg font-medium text-foreground">So'nggi bronlar</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Bugungi va eng oxirgi faoliyat</p>
            </div>
            <Link
              to="/admin/bookings"
              className="text-sm font-medium text-foreground hover:underline"
            >
              Hammasini ko'rish →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold tracking-wider text-muted-foreground uppercase bg-background border-b border-border">
                  <th className="px-6 py-3 font-medium">Mijoz</th>
                  <th className="px-6 py-3 font-medium">Salon</th>
                  <th className="px-6 py-3 font-medium">Vaqt</th>
                  <th className="px-6 py-3 font-medium">Holat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {bookingsQ.isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={4} className="px-6 py-4">
                          <div className="h-3 bg-muted rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  : recentBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-background/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={b.client_avatar}
                              alt=""
                              className="size-8 rounded-full object-cover"
                            />
                            <div>
                              <div className="font-medium text-foreground">{b.client_name}</div>
                              <div className="text-muted-foreground text-xs">{b.service}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">{b.salon_name}</div>
                          <div className="text-xs text-muted-foreground">{b.barber_name}</div>
                        </td>
                        <td className="px-6 py-4 tabular-nums text-foreground">
                          {format(new Date(b.start_at), "dd MMM, HH:mm")}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={b.status} />
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Region breakdown */}
        <div className="bg-card rounded-2xl border border-border shadow-card p-6 flex flex-col">
          <h2 className="font-heading text-lg font-medium text-foreground mb-1">
            Hududlar bo'yicha
          </h2>
          <p className="text-xs text-muted-foreground mb-6">Bron hajmi taqsimoti</p>

          <div className="space-y-5 flex-1">
            {stats?.regions
              .sort((a, b) => b.bookings - a.bookings)
              .map((r, i) => {
                const max = Math.max(...stats.regions.map((x) => x.bookings));
                const pct = max ? (r.bookings / max) * 100 : 0;
                return (
                  <div key={r.code}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-foreground">{r.name}</span>
                      <span className="tabular-nums text-muted-foreground">{r.bookings} bron</span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full bg-foreground rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          opacity: 1 - i * 0.15,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{r.barbers} sartarosh</span>
                      <span>{r.salons} salon</span>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Toshkent shahar bronlari boshqa hududlardan ko'p — bu yerda peak vaqtlarda qo'shimcha
              sartaroshlar talab etiladi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
