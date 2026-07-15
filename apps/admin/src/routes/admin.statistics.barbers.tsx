import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Scissors } from "lucide-react";
import { downloadStatisticsCsv, fetchAdminUserSignupAnalytics } from "@/lib/admin-api";
import { getBarberSegmentTitle } from "@/lib/barber-segment-copy";
import type { AdminBarberAccountSegment } from "@/lib/admin-api";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatsPageHeader } from "@/components/admin/StatisticsShell";
import { DonutChart, DualBarChart } from "@/components/admin/StatsCharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/statistics/barbers")({
  component: StatisticsBarbersPage,
});

const SEGMENT_META: Record<string, { label: string; className: string }> = {
  independent: { label: "Mustaqil", className: "bg-sky-500/10 text-sky-800 dark:text-sky-200" },
  mybarber_salon: {
    label: "MyBarber salon",
    className: "bg-violet-500/10 text-violet-800 dark:text-violet-200",
  },
  salon_owner: {
    label: "Salon egasi",
    className: "bg-amber-500/10 text-amber-900 dark:text-amber-200",
  },
  salon_employee: {
    label: "Salonda ishlaydi",
    className: "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
  },
  unknown: { label: "Aniqlanmagan", className: "bg-muted text-muted-foreground" },
};

function StatisticsBarbersPage() {
  const q = useQuery({
    queryKey: ["admin", "stats-barbers"],
    queryFn: () => fetchAdminUserSignupAnalytics(150),
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });

  const barbers = q.data?.barbers;
  const summary = barbers?.summary;

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Sartaroshlar analitikasi"
        description="Mustaqil, salon egasi, salonga qo‘shilgan — kim qayerda ishlaydi / qaysi salonga ega."
        onExport={() => downloadStatisticsCsv("barbers")}
      >
        <Link
          to="/admin/barbers"
          className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
        >
          Sartaroshlar ro‘yxati →
        </Link>
      </StatsPageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {q.isLoading || !summary ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KPICard label="Jami sartarosh" value={summary.total.toLocaleString()} icon={Scissors} />
            <KPICard label="Mustaqil" value={summary.independent.toLocaleString()} />
            <KPICard label="Salon egasi" value={summary.salonOwner.toLocaleString()} />
            <KPICard label="Salonda ishlaydi" value={summary.salonEmployee.toLocaleString()} />
            <KPICard
              label="Bugun"
              value={summary.todayTotal.toLocaleString()}
              hint={`Mustaqil ${summary.todayIndependent} · Salon ${summary.todaySalon}`}
            />
            <KPICard
              label="7 kun"
              value={summary.weekTotal.toLocaleString()}
              hint={`Mustaqil ${summary.weekIndependent} · Salon ${summary.weekSalon}`}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6 lg:col-span-2">
          <h2 className="font-heading text-lg font-semibold">So‘nggi 7 kun</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Yangi sartaroshlar — mustaqil vs salon bog‘liq
          </p>
          {q.isLoading || !barbers ? (
            <div className="mt-6 h-56 animate-pulse rounded-xl bg-muted/40" />
          ) : (
            <div className="mt-4">
              <DualBarChart data={barbers.daily} keys={["independent", "salon"]} />
            </div>
          )}
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Segment bo‘yicha</h2>
          <p className="mt-1 text-sm text-muted-foreground">Jami sartaroshlar taqsimoti</p>
          {q.isLoading || !summary ? (
            <div className="mt-6 h-48 animate-pulse rounded-xl bg-muted/40" />
          ) : (
            <DonutChart
              slices={[
                { name: "Mustaqil", value: summary.independent, color: "hsl(199 89% 42%)" },
                { name: "Salon egasi", value: summary.salonOwner, color: "hsl(38 92% 50%)" },
                {
                  name: "Salonda ishlaydi",
                  value: summary.salonEmployee,
                  color: "hsl(142 55% 38%)",
                },
                {
                  name: "MyBarber salon",
                  value: summary.mybarberSalon,
                  color: "hsl(262 60% 55%)",
                },
                { name: "Boshqa", value: summary.other, color: "hsl(220 10% 60%)" },
              ]}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(
          [
            "independent",
            "salon_owner",
            "salon_employee",
            "mybarber_salon",
            "unknown",
          ] as AdminBarberAccountSegment[]
        ).map((seg) => (
          <Link
            key={seg}
            to="/admin/barbers"
            search={{ segment: seg, q: "", region: "", page: 1 }}
            className="rounded-xl border border-border bg-card px-4 py-3 shadow-card transition-colors hover:border-primary/40"
          >
            <p className="text-xs text-muted-foreground">{getBarberSegmentTitle(seg)}</p>
            <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
              {summary
                ? (
                    {
                      independent: summary.independent,
                      salon_owner: summary.salonOwner,
                      salon_employee: summary.salonEmployee,
                      mybarber_salon: summary.mybarberSalon,
                      unknown: summary.other,
                    } as Record<string, number>
                  )[seg]?.toLocaleString() ?? "0"
                : "—"}
            </p>
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold">So‘nggi qo‘shilgan sartaroshlar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Segment, egalik va ish joyi salonlari
          </p>
        </div>
        {q.isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : !barbers || barbers.recent.length === 0 ? (
          <EmptyState
            title="Hali sartarosh yo‘q"
            description="Birinchi sartarosh qo‘shilganda shu yerda ko‘rinadi."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-background text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Sartarosh</th>
                  <th className="px-6 py-3 font-medium">Segment</th>
                  <th className="px-6 py-3 font-medium">Egalik</th>
                  <th className="px-6 py-3 font-medium">Ish joyi</th>
                  <th className="px-6 py-3 font-medium">Hudud</th>
                  <th className="px-6 py-3 font-medium">Vaqt</th>
                  <th className="px-6 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {barbers.recent.map((row) => {
                  const meta = SEGMENT_META[row.segment] ?? SEGMENT_META.unknown;
                  return (
                    <tr key={row.id} className="hover:bg-background/50">
                      <td className="px-6 py-4">
                        <div className="font-medium">{row.fullName}</div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {row.phone || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            meta.className,
                          )}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {row.ownedSalons.length > 0 ? row.ownedSalons.join(", ") : "—"}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {row.worksAtSalons.length > 0 ? row.worksAtSalons.join(", ") : "—"}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {row.regionLabel || "—"}
                      </td>
                      <td className="px-6 py-4 tabular-nums text-muted-foreground">
                        {row.createdAt
                          ? format(parseISO(row.createdAt), "dd.MM.yyyy HH:mm")
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to="/admin/barbers/$barberId"
                          params={{ barberId: String(row.id) }}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Profil
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
