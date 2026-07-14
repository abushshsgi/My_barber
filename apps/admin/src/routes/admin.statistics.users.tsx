import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Chrome, Phone, Users } from "lucide-react";
import {
  downloadStatisticsCsv,
  fetchAdminUserSignupAnalytics,
  type UserSignupMethod,
} from "@/lib/admin-api";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatsPageHeader } from "@/components/admin/StatisticsShell";
import { DonutChart, DualBarChart } from "@/components/admin/StatsCharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/statistics/users")({
  component: StatisticsUsersPage,
});

const METHOD_META: Record<UserSignupMethod, { label: string; className: string }> = {
  google: { label: "Google", className: "bg-blue-500/10 text-blue-700" },
  phone: { label: "Telefon", className: "bg-emerald-500/10 text-emerald-700" },
  email: { label: "Email", className: "bg-amber-500/10 text-amber-700" },
  unknown: { label: "Noma'lum", className: "bg-muted text-muted-foreground" },
};

function StatisticsUsersPage() {
  const q = useQuery({
    queryKey: ["admin", "stats-users"],
    queryFn: () => fetchAdminUserSignupAnalytics(150),
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });

  const data = q.data;
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Mijozlar"
        description="Faqat statistika: ro'yxatdan o'tish (Google / telefon). Har bir mijozning batafsil profili — Mijozlar sahifasida."
        onExport={() => downloadStatisticsCsv("users")}
      >
        <Link
          to="/admin/users"
          className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
        >
          Mijozlar ro'yxati →
        </Link>
      </StatsPageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {q.isLoading || !summary ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KPICard label="Jami mijozlar" value={summary.total.toLocaleString()} icon={Users} />
            <KPICard label="Google orqali" value={summary.google.toLocaleString()} icon={Chrome} />
            <KPICard label="Telefon orqali" value={summary.phone.toLocaleString()} icon={Phone} />
            <KPICard label="Bugun" value={summary.todayTotal.toLocaleString()} hint={`G ${summary.todayGoogle} · T ${summary.todayPhone}`} />
            <KPICard label="7 kun" value={summary.weekTotal.toLocaleString()} hint={`G ${summary.weekGoogle} · T ${summary.weekPhone}`} />
            <KPICard label="Boshqa usul" value={summary.other.toLocaleString()} hint="Email va h.k." />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6 lg:col-span-2">
          <h2 className="font-heading text-lg font-semibold">So'nggi 7 kun</h2>
          <p className="text-sm text-muted-foreground mt-1">Kunlik ro'yxatdan o'tishlar (Google vs telefon)</p>
          {q.isLoading || !data ? (
            <div className="mt-6 h-56 animate-pulse rounded-xl bg-muted/40" />
          ) : (
            <div className="mt-4">
              <DualBarChart data={data.daily} keys={["google", "phone"]} />
            </div>
          )}
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Usul bo'yicha</h2>
          <p className="text-sm text-muted-foreground mt-1">Jami mijozlar taqsimoti</p>
          {q.isLoading || !summary ? (
            <div className="mt-6 h-48 animate-pulse rounded-xl bg-muted/40" />
          ) : (
            <DonutChart
              slices={[
                { name: "Google", value: summary.google, color: "hsl(221 70% 50%)" },
                { name: "Telefon", value: summary.phone, color: "hsl(142 55% 38%)" },
                { name: "Boshqa", value: summary.other, color: "hsl(38 92% 50%)" },
              ]}
            />
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold">So'nggi ro'yxatdan o'tganlar</h2>
        </div>
        {q.isLoading ? (
          <TableSkeleton rows={8} cols={4} />
        ) : !data || data.recent.length === 0 ? (
          <EmptyState title="Hali mijoz yo'q" description="Birinchi ro'yxatdan o'tish shu yerda ko'rinadi." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Mijoz</th>
                  <th className="px-6 py-3 font-medium">Aloqa</th>
                  <th className="px-6 py-3 font-medium">Usul</th>
                  <th className="px-6 py-3 font-medium">Vaqt</th>
                  <th className="px-6 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.recent.map((row) => {
                  const meta = METHOD_META[row.signupMethod] ?? METHOD_META.unknown;
                  return (
                    <tr key={row.id} className="hover:bg-background/50">
                      <td className="px-6 py-4 font-medium">{row.fullName}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <div>{row.phone || "—"}</div>
                        {row.displayEmail ? <div className="text-xs mt-0.5">{row.displayEmail}</div> : null}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", meta.className)}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 tabular-nums text-muted-foreground">
                        {row.dateJoined ? format(parseISO(row.dateJoined), "dd.MM.yyyy HH:mm") : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to="/admin/users/$userId"
                          params={{ userId: String(row.id) }}
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
