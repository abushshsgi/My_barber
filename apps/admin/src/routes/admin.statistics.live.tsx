import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Building2,
  Chrome,
  Phone,
  Radio,
  Scissors,
  Sparkles,
  Users,
} from "lucide-react";
import { fetchPlatformLiveStats } from "@/lib/admin-api";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { LiveMetricHero, LivePulseBadge } from "@/components/admin/LiveMetricHero";
import {
  CombinedSignupAreaChart,
  DonutChart,
  DualBarChart,
} from "@/components/admin/StatsCharts";
import { StatsPageHeader } from "@/components/admin/StatisticsShell";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/statistics/live")({
  component: StatisticsLivePage,
});

const SEGMENT_LABELS: Record<string, string> = {
  independent: "Mustaqil",
  mybarber_salon: "MyBarber salon",
  salon_owner: "Salon egasi",
  salon_employee: "Salonga qo'shilgan",
  unknown: "Boshqa",
};

const METHOD_LABELS: Record<string, { label: string; className: string }> = {
  google: { label: "Google", className: "bg-blue-500/10 text-blue-700" },
  phone: { label: "Telefon", className: "bg-emerald-500/10 text-emerald-700" },
  email: { label: "Email", className: "bg-amber-500/10 text-amber-700" },
  unknown: { label: "Boshqa", className: "bg-muted text-muted-foreground" },
};

type FeedItem = {
  id: string;
  type: "user" | "barber" | "salon";
  title: string;
  subtitle: string;
  badge: string;
  badgeClass: string;
  at: string;
  linkTo: string;
  linkParams?: Record<string, string>;
};

function StatisticsLivePage() {
  const q = useQuery({
    queryKey: ["admin", "stats-live"],
    queryFn: () => fetchPlatformLiveStats(30),
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
    retry: 2,
    staleTime: 10_000,
  });

  const d = q.data;
  const isInitial = q.isPending && !d;
  const todayAnimated = useAnimatedNumber(d?.summary.todaySignups ?? 0, 600);

  const feed = useMemo<FeedItem[]>(() => {
    if (!d) return [];
    const items: FeedItem[] = [];

    for (const u of d.users.recent) {
      const meta = METHOD_LABELS[u.signupMethod] ?? METHOD_LABELS.unknown;
      items.push({
        id: `u-${u.id}`,
        type: "user",
        title: u.fullName,
        subtitle: u.phone || u.displayEmail || "—",
        badge: meta.label,
        badgeClass: meta.className,
        at: u.dateJoined ?? "",
        linkTo: "/admin/users/$userId",
        linkParams: { userId: String(u.id) },
      });
    }
    for (const b of d.barbers.recent) {
      items.push({
        id: `b-${b.id}`,
        type: "barber",
        title: b.fullName,
        subtitle: b.phone || b.regionLabel || "—",
        badge: SEGMENT_LABELS[b.segment] ?? b.segment,
        badgeClass: "bg-purple-500/10 text-purple-700",
        at: b.createdAt ?? "",
        linkTo: "/admin/barbers/$barberId",
        linkParams: { barberId: String(b.id) },
      });
    }
    for (const s of d.salons.recent) {
      items.push({
        id: `s-${s.id}`,
        type: "salon",
        title: s.name,
        subtitle: s.ownerName || s.address || "—",
        badge: s.isPublished ? "Chiqarilgan" : "Tekshiruvda",
        badgeClass: s.isPublished
          ? "bg-emerald-500/10 text-emerald-700"
          : "bg-amber-500/10 text-amber-700",
        at: s.createdAt ?? "",
        linkTo: "/admin/salons/$salonId",
        linkParams: { salonId: String(s.id) },
      });
    }

    return items
      .filter((i) => i.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 25);
  }, [d]);

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Real vaqt"
        description="Platformaga ro'yxatdan o'tishlar — har 15 soniyada yangilanadi."
      >
        <LivePulseBadge />
      </StatsPageHeader>

      {q.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4">
          <p className="text-sm font-medium text-destructive">Ma'lumotlarni yuklab bo'lmadi</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {q.error instanceof Error ? q.error.message : "Noma'lum xatolik"}
          </p>
          <button
            type="button"
            onClick={() => q.refetch()}
            className="mt-3 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Qayta urinish
          </button>
        </div>
      ) : null}

      {/* Bugun jami — markaziy banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-foreground/[0.03] via-card to-card p-6 sm:p-8 shadow-card">
        <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 size-48 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Radio className="size-4 text-emerald-500" />
              Bugun platformaga qo'shilgan
            </div>
            <p className="mt-2 font-heading text-6xl font-bold tabular-nums tracking-tight sm:text-7xl lg:text-8xl">
              {isInitial ? "—" : todayAnimated.toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Mijoz {d?.summary.todayClients ?? 0} · Sartarosh {d?.summary.todayBarbers ?? 0} · Salon{" "}
              {d?.summary.todaySalons ?? 0}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <MiniStat label="7 kun" value={d?.summary.weekSignups} loading={isInitial} />
            <MiniStat
              label="Yangilangan"
              valueLabel={
                d?.generatedAt
                  ? format(parseISO(d.generatedAt), "HH:mm:ss")
                  : "—"
              }
              loading={isInitial}
            />
          </div>
        </div>
      </div>

      {/* Katta KPI kartalar */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {isInitial ? (
          <>
            <CardSkeleton className="min-h-[200px]" />
            <CardSkeleton className="min-h-[200px]" />
            <CardSkeleton className="min-h-[200px]" />
          </>
        ) : d ? (
          <>
            <LiveMetricHero
              label="Jami mijozlar"
              value={d.summary.clientsTotal}
              todayDelta={d.summary.todayClients}
              sublabel={`Google ${d.users.summary.google.toLocaleString()} · Telefon ${d.users.summary.phone.toLocaleString()}`}
              icon={Users}
              accent="blue"
            />
            <LiveMetricHero
              label="Jami sartaroshlar"
              value={d.summary.barbersTotal}
              todayDelta={d.summary.todayBarbers}
              sublabel={`Mustaqil ${d.barbers.summary.independent.toLocaleString()} · Salon ${(d.barbers.summary.salonOwner + d.barbers.summary.salonEmployee).toLocaleString()}`}
              icon={Scissors}
              accent="purple"
            />
            <LiveMetricHero
              label="Jami salonlar"
              value={d.summary.salonsTotal}
              todayDelta={d.summary.todaySalons}
              sublabel={`Chiqarilgan ${d.salons.summary.published.toLocaleString()} · Tekshiruvda ${d.salons.summary.pending.toLocaleString()}`}
              icon={Building2}
              accent="emerald"
            />
          </>
        ) : null}
      </div>

      {/* Grafiklar */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title="Birlashgan trend"
          description="So'nggi 7 kun — mijoz, sartarosh, salon"
          icon={<Sparkles className="size-4" />}
          className="xl:col-span-2"
          loading={isInitial}
        >
          {d ? <CombinedSignupAreaChart data={d.combinedDaily} /> : null}
        </ChartCard>

        <ChartCard
          title="Mijoz usullari"
          description="Ro'yxatdan o'tish manbasi"
          icon={<Users className="size-4" />}
          loading={isInitial}
        >
          {d ? (
            <DonutChart
              slices={[
                { name: "Google", value: d.users.summary.google, color: "hsl(221 70% 50%)" },
                { name: "Telefon", value: d.users.summary.phone, color: "hsl(142 55% 38%)" },
                { name: "Boshqa", value: d.users.summary.other, color: "hsl(38 92% 50%)" },
              ]}
            />
          ) : null}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Mijozlar — kunlik"
          description="Google vs telefon"
          icon={<Chrome className="size-4" />}
          loading={isInitial}
        >
          {d ? <DualBarChart data={d.users.daily} keys={["google", "phone"]} /> : null}
        </ChartCard>
        <ChartCard
          title="Sartaroshlar — kunlik"
          description="Mustaqil vs salon bilan"
          icon={<Scissors className="size-4" />}
          loading={isInitial}
        >
          {d ? <DualBarChart data={d.barbers.daily} keys={["independent", "salon"]} /> : null}
        </ChartCard>
      </div>

      {/* Live feed */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">Jonli oqim</h2>
            <p className="text-sm text-muted-foreground">So'nggi ro'yxatdan o'tishlar — barcha turlar</p>
          </div>
          <LivePulseBadge label="Live" />
        </div>
        {isInitial ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
        ) : q.isError ? (
          <EmptyState title="Oqim yuklanmadi" description="Yuqoridagi Qayta urinish tugmasini bosing." />
        ) : feed.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Hali ro'yxatdan o'tish yo'q</p>
        ) : (
          <ul className="divide-y divide-border">
            {feed.map((item, idx) => (
              <li
                key={item.id}
                className="animate-in fade-in slide-in-from-left-2 flex items-center gap-4 px-6 py-4 duration-500"
                style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
              >
                <TypeIcon type={item.type} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{item.title}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", item.badgeClass)}>
                      {item.badge}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {format(parseISO(item.at), "dd.MM HH:mm")}
                  </p>
                  {item.linkParams ? (
                    <Link
                      to={item.linkTo}
                      params={item.linkParams}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Ko'rish
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  valueLabel,
  loading,
}: {
  label: string;
  value?: number;
  valueLabel?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/80 px-4 py-3 backdrop-blur-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold tabular-nums">
        {loading ? "—" : valueLabel ?? value?.toLocaleString() ?? "0"}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  description,
  icon,
  children,
  className,
  loading,
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
}) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-card", className)}>
      <div className="flex items-start gap-3 border-b border-border bg-gradient-to-r from-muted/40 to-card px-5 py-4">
        <span className="grid size-9 place-items-center rounded-lg bg-foreground text-background">{icon}</span>
        <div>
          <h2 className="font-heading text-base font-semibold">{title}</h2>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      <div className="p-5 sm:p-6">
        {loading ? <div className="h-[220px] animate-pulse rounded-xl bg-muted/40" /> : children}
      </div>
    </section>
  );
}

function TypeIcon({ type }: { type: FeedItem["type"] }) {
  const map = {
    user: { Icon: Users, cls: "bg-blue-500/10 text-blue-600" },
    barber: { Icon: Scissors, cls: "bg-purple-500/10 text-purple-600" },
    salon: { Icon: Building2, cls: "bg-emerald-500/10 text-emerald-600" },
  }[type];
  const { Icon, cls } = map;
  return (
    <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", cls)}>
      <Icon className="size-4" />
    </span>
  );
}
