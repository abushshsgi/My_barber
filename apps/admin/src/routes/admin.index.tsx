import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fetchAdminStats, fetchAdminBookings, downloadAdminReport } from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, Users, Scissors, Building2, CalendarClock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
});

function DashboardPage() {
  const reportMut = useMutation({
    mutationFn: () => downloadAdminReport("stats"),
    onSuccess: () => toast.success("Hisobot tayyorlandi"),
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Hisobotni olishda xatolik"),
  });

  const statsQ = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchAdminStats,
  });

  const bookingsQ = useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: () => fetchAdminBookings(),
  });

  const stats = statsQ.data;
  const recentBookings = (bookingsQ.data?.results ?? []).slice(0, 6);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/30 p-6 sm:p-8 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Mysaloon Admin
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground mt-1">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 text-sm max-w-xl">
              Tarmoq bo&apos;yicha umumiy ko&apos;rinish — mijozlar, sartaroshlar, bronlar va daromad.
            </p>
          </div>
          <Button onClick={() => reportMut.mutate()} disabled={reportMut.isPending} className="shrink-0">
            <Download className="size-4 mr-2" />
            Hisobot olish
          </Button>
        </div>
      </div>

      {(statsQ.isError || bookingsQ.isError) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {statsQ.error instanceof Error
            ? statsQ.error.message
            : bookingsQ.error instanceof Error
              ? bookingsQ.error.message
              : "Ma'lumotlarni yuklashda xatolik"}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statsQ.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : stats ? (
          <>
            <KPICard
              label="Jami mijozlar"
              value={stats.total_users.toLocaleString()}
              delta={stats.delta.users}
              icon={Users}
            />
            <KPICard
              label="Faol sartaroshlar"
              value={stats.total_barbers.toLocaleString()}
              delta={stats.delta.barbers}
              icon={Scissors}
            />
            <KPICard
              label="Salonlar"
              value={stats.total_salons.toLocaleString()}
              hint="Hamkor"
              icon={Building2}
            />
            <KPICard
              label="Jami bronlar"
              value={stats.total_bookings.toLocaleString()}
              icon={CalendarClock}
            />
            <KPICard
              label="Haftalik bronlar"
              value={stats.weekly_bookings.toLocaleString()}
              delta={stats.delta.bookings}
              icon={CalendarClock}
            />
            <KPICard
              label="Daromad"
              value={formatAdminUzs(stats.revenue_uzs)}
              delta={stats.delta.revenue}
              icon={TrendingUp}
            />
          </>
        ) : null}
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
                          <StatusBadge status={dashboardBookingBadge(b.status)} />
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
              .slice()
              .sort((a, b) => b.bookings - a.bookings)
              .map((r, i) => {
                const max = Math.max(...stats.regions.map((x) => x.bookings), 1);
                const pct = (r.bookings / max) * 100;
                return (
                  <div key={r.code}>
                    <div className="flex justify-between text-sm mb-1.5 gap-2">
                      <span className="font-medium text-foreground truncate">{r.name}</span>
                      <span className="tabular-nums text-muted-foreground shrink-0">
                        {r.bookings.toLocaleString()} bron
                      </span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full bg-foreground rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          opacity: 1 - i * 0.12,
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                      <span>{r.barbers} sartarosh</span>
                      <span>{r.salons} salon</span>
                      <span>{r.users} mijoz</span>
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

function dashboardBookingBadge(
  s: string,
): "pending" | "confirmed" | "in_chair" | "completed" | "cancelled" {
  if (s === "accepted") return "confirmed";
  if (s === "in_progress") return "in_chair";
  if (s === "completed") return "completed";
  if (s === "cancelled" || s === "rejected") return "cancelled";
  return "pending";
}
