import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Activity, Building2, Chrome, Phone, Users } from "lucide-react";
import { fetchAdminUserSignupAnalytics, type UserSignupMethod } from "@/lib/admin-api";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users/signups")({
  component: UserSignupsPage,
});

const METHOD_META: Record<UserSignupMethod, { label: string; className: string }> = {
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

function DailyBars({
  days,
  maxValue,
  bars,
}: {
  days: Array<{ date: string; total: number }>;
  maxValue: number;
  bars: Array<{ key: string; getValue: (day: (typeof days)[number]) => number; className: string; label: string }>;
}) {
  return (
    <>
      <div className="mt-6 grid grid-cols-7 gap-2 sm:gap-3">
        {days.map((day) => (
          <div key={day.date} className="flex flex-col items-center gap-2">
            <div className="flex h-36 w-full max-w-[72px] items-end justify-center gap-1">
              {bars.map((bar) => (
                <div
                  key={bar.key}
                  className={cn("w-3 rounded-t", bar.className)}
                  style={{ height: `${Math.max(8, (bar.getValue(day) / maxValue) * 100)}%` }}
                  title={`${bar.label}: ${bar.getValue(day)}`}
                />
              ))}
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold tabular-nums">{day.total}</p>
              <p className="text-[10px] text-muted-foreground">{format(parseISO(day.date), "dd.MM")}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {bars.map((bar) => (
          <span key={bar.key} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", bar.className)} /> {bar.label}
          </span>
        ))}
      </div>
    </>
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
  const salonSummary = data?.salons.summary;
  const maxUserDaily = Math.max(1, ...(data?.daily.map((d) => d.total) ?? [1]));
  const maxSalonDaily = Math.max(1, ...(data?.salons.daily.map((d) => d.total) ?? [1]));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            Ro&apos;yxatdan o&apos;tish
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Mijozlar va salonlar platformaga qo&apos;shilishi — real vaqtda (10 soniyada yangilanadi).
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {analyticsQ.isLoading || !summary ? (
          <>
            <CardSkeleton className="min-h-[168px]" />
            <CardSkeleton className="min-h-[168px]" />
          </>
        ) : (
          <>
            <KPICard
              size="hero"
              label="Jami mijozlar"
              value={summary.total.toLocaleString()}
              icon={Users}
              hint={`Bugun +${summary.todayTotal} · 7 kun +${summary.weekTotal}`}
              className="bg-gradient-to-br from-card to-blue-500/5"
            />
            <KPICard
              size="hero"
              label="Jami salonlar"
              value={(salonSummary?.total ?? 0).toLocaleString()}
              icon={Building2}
              hint={`Chiqarilgan ${salonSummary?.published ?? 0} · Tekshiruvda ${salonSummary?.pending ?? 0}`}
              className="bg-gradient-to-br from-card to-amber-500/5"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {analyticsQ.isLoading || !summary || !salonSummary ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KPICard label="Google orqali" value={summary.google.toLocaleString()} icon={Chrome} />
            <KPICard label="Telefon orqali" value={summary.phone.toLocaleString()} icon={Phone} />
            <KPICard
              label="Bugun mijoz"
              value={summary.todayTotal.toLocaleString()}
              hint={`Google ${summary.todayGoogle} · Tel ${summary.todayPhone}`}
            />
            <KPICard label="Chiqarilgan salon" value={salonSummary.published.toLocaleString()} />
            <KPICard label="Tekshiruvda salon" value={salonSummary.pending.toLocaleString()} />
            <KPICard
              label="Bugun salon"
              value={salonSummary.todayTotal.toLocaleString()}
              hint={`Chiqarilgan ${salonSummary.todayPublished} · Tekshiruvda ${salonSummary.todayPending}`}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Mijozlar — so&apos;nggi 7 kun</h2>
          <p className="text-sm text-muted-foreground mt-1">Kunlik ro&apos;yxatdan o&apos;tishlar (Google vs telefon)</p>
          {analyticsQ.isLoading || !data ? (
            <div className="mt-6 h-40 animate-pulse rounded-xl bg-muted/40" />
          ) : (
            <DailyBars
              days={data.daily}
              maxValue={maxUserDaily}
              bars={[
                {
                  key: "google",
                  label: "Google",
                  className: "bg-blue-500/80",
                  getValue: (day) => ("google" in day ? Number(day.google) : 0),
                },
                {
                  key: "phone",
                  label: "Telefon",
                  className: "bg-emerald-500/80",
                  getValue: (day) => ("phone" in day ? Number(day.phone) : 0),
                },
              ]}
            />
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Salonlar — so&apos;nggi 7 kun</h2>
          <p className="text-sm text-muted-foreground mt-1">Platformaga qo&apos;shilgan salonlar (chiqarilgan vs tekshiruvda)</p>
          {analyticsQ.isLoading || !data ? (
            <div className="mt-6 h-40 animate-pulse rounded-xl bg-muted/40" />
          ) : (
            <DailyBars
              days={data.salons.daily}
              maxValue={maxSalonDaily}
              bars={[
                {
                  key: "published",
                  label: "Chiqarilgan",
                  className: "bg-emerald-500/80",
                  getValue: (day) => ("published" in day ? Number(day.published) : 0),
                },
                {
                  key: "pending",
                  label: "Tekshiruvda",
                  className: "bg-amber-500/80",
                  getValue: (day) => ("pending" in day ? Number(day.pending) : 0),
                },
              ]}
            />
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold">So&apos;nggi ro&apos;yxatdan o&apos;tgan mijozlar</h2>
          <p className="text-sm text-muted-foreground mt-1">Kim, qachon va qaysi usul bilan kirgan</p>
        </div>
        {analyticsQ.isLoading ? (
          <TableSkeleton rows={8} cols={5} />
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
                      {row.displayEmail ? <div className="text-xs mt-0.5">{row.displayEmail}</div> : null}
                    </td>
                    <td className="px-6 py-4">
                      <MethodBadge method={row.signupMethod} />
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold">So&apos;nggi qo&apos;shilgan salonlar</h2>
          <p className="text-sm text-muted-foreground mt-1">Platformaga qo&apos;shilgan barcha salonlar real vaqtda</p>
        </div>
        {analyticsQ.isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : !data || data.salons.recent.length === 0 ? (
          <EmptyState title="Hali salon yo'q" description="Birinchi salon qo'shilganda shu yerda ko'rinadi." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Salon</th>
                  <th className="px-6 py-3 font-medium">Egasi</th>
                  <th className="px-6 py-3 font-medium">Hudud</th>
                  <th className="px-6 py-3 font-medium">Holat</th>
                  <th className="px-6 py-3 font-medium">Vaqt</th>
                  <th className="px-6 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.salons.recent.map((row) => (
                  <tr key={row.id} className="hover:bg-background/50">
                    <td className="px-6 py-4">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {row.address || row.phone || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{row.ownerName || "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{row.regionLabel || "Ko'rsatilmagan"}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={row.isPublished ? "published" : "draft"} />
                    </td>
                    <td className="px-6 py-4 tabular-nums text-muted-foreground">
                      {row.createdAt ? format(parseISO(row.createdAt), "dd.MM.yyyy HH:mm") : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to="/admin/salons/$salonId"
                        params={{ salonId: String(row.id) }}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Salon
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
