import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Activity, Chrome, Phone, Users } from "lucide-react";
import { fetchAdminUserSignupAnalytics, type UserSignupMethod } from "@/lib/admin-api";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users/signups")({
  component: UserSignupsPage,
});

const METHOD_META: Record<
  UserSignupMethod,
  { label: string; className: string }
> = {
  google: { label: "Google", className: "bg-blue-500/10 text-blue-700" },
  phone: { label: "Telefon", className: "bg-emerald-500/10 text-emerald-700" },
  email: { label: "Email", className: "bg-amber-500/10 text-amber-700" },
  unknown: { label: "Noma'lum", className: "bg-muted text-muted-foreground" },
};

function MethodBadge({ method }: { method: UserSignupMethod }) {
  const meta = METHOD_META[method] ?? METHOD_META.unknown;
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", meta.className)}>
      {meta.label}
    </span>
  );
}

function UserSignupsPage() {
  const analyticsQ = useQuery({
    queryKey: ["admin", "user-signups"],
    queryFn: () => fetchAdminUserSignupAnalytics(150),
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });

  const data = analyticsQ.data;
  const summary = data?.summary;
  const maxDaily = Math.max(1, ...(data?.daily.map((d) => d.total) ?? [1]));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            Ro&apos;yxatdan o&apos;tish
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Mijozlar qaysi usul bilan ro&apos;yxatdan o&apos;tgani — telefon yoki Google (10 soniyada yangilanadi).
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <Activity className="size-3.5" />
          {analyticsQ.dataUpdatedAt
            ? `Yangilandi: ${format(analyticsQ.dataUpdatedAt, "HH:mm:ss")}`
            : "Yuklanmoqda..."}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {analyticsQ.isLoading || !summary ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KPICard label="Jami mijozlar" value={summary.total.toLocaleString()} icon={Users} />
            <KPICard label="Google orqali" value={summary.google.toLocaleString()} icon={Chrome} />
            <KPICard label="Telefon orqali" value={summary.phone.toLocaleString()} icon={Phone} />
            <KPICard
              label="Bugun jami"
              value={summary.todayTotal.toLocaleString()}
              hint={`Google ${summary.todayGoogle} · Tel ${summary.todayPhone}`}
            />
            <KPICard
              label="7 kun jami"
              value={summary.weekTotal.toLocaleString()}
              hint={`Google ${summary.weekGoogle} · Tel ${summary.weekPhone}`}
            />
            <KPICard label="Boshqa usul" value={summary.other.toLocaleString()} hint="Email va h.k." />
          </>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">So&apos;nggi 7 kun</h2>
        <p className="text-sm text-muted-foreground mt-1">Kunlik ro&apos;yxatdan o&apos;tishlar (Google vs telefon)</p>
        {analyticsQ.isLoading || !data ? (
          <div className="mt-6 h-40 animate-pulse rounded-xl bg-muted/40" />
        ) : (
          <div className="mt-6 grid grid-cols-7 gap-2 sm:gap-3">
            {data.daily.map((day) => (
              <div key={day.date} className="flex flex-col items-center gap-2">
                <div className="flex h-36 w-full max-w-[72px] items-end justify-center gap-1">
                  <div
                    className="w-3 rounded-t bg-blue-500/80"
                    style={{ height: `${Math.max(8, (day.google / maxDaily) * 100)}%` }}
                    title={`Google: ${day.google}`}
                  />
                  <div
                    className="w-3 rounded-t bg-emerald-500/80"
                    style={{ height: `${Math.max(8, (day.phone / maxDaily) * 100)}%` }}
                    title={`Telefon: ${day.phone}`}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold tabular-nums">{day.total}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(parseISO(day.date), "dd.MM")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-blue-500/80" /> Google
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500/80" /> Telefon
          </span>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold">So&apos;nggi ro&apos;yxatdan o&apos;tganlar</h2>
          <p className="text-sm text-muted-foreground mt-1">Kim, qachon va qaysi usul bilan kirgan</p>
        </div>
        {analyticsQ.isLoading ? (
          <TableSkeleton rows={10} cols={5} />
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
                {data.recent.map((row) => (
                  <tr key={row.id} className="hover:bg-background/50">
                    <td className="px-6 py-4 font-medium">{row.fullName}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div>{row.phone || "—"}</div>
                      {row.displayEmail ? (
                        <div className="text-xs mt-0.5">{row.displayEmail}</div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <MethodBadge method={row.signupMethod} />
                    </td>
                    <td className="px-6 py-4 tabular-nums text-muted-foreground">
                      {row.dateJoined
                        ? format(parseISO(row.dateJoined), "dd.MM.yyyy HH:mm")
                        : "—"}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
