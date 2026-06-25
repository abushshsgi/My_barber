import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Users, Star, CalendarClock, TrendingUp, Repeat } from "lucide-react";
import { useBarberContext, formatUZS } from "@/components/barber/BarberContext";
import { PageHeader, StatCard, SectionCard, UserAvatar } from "@/components/barber/primitives";
import { useBarberAnalyticsQuery } from "@/hooks/use-barber-queries";

export const Route = createFileRoute("/barber/stats")({
  component: StatsPage,
});

type RangeKey = "7d" | "30d" | "90d";

function rangeDates(key: RangeKey) {
  const end = new Date();
  const start = new Date();
  if (key === "7d") start.setDate(end.getDate() - 6);
  else if (key === "30d") start.setDate(end.getDate() - 29);
  else start.setDate(end.getDate() - 89);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function StatsPage() {
  const { bookings, clients, reviews, viewMode, activeSalonId } = useBarberContext();
  const [range, setRange] = useState<RangeKey>("30d");
  const dates = useMemo(() => rangeDates(range), [range]);
  const { data: analytics, isLoading } = useBarberAnalyticsQuery({
    start: dates.start,
    end: dates.end,
    independent: viewMode === "independent",
    salonId: activeSalonId,
  });

  const completed = bookings.filter((b) => b.status === "completed");
  const completionRate = analytics
    ? (analytics.completed_count / Math.max(1, analytics.completed_count + (analytics.cancelled_count ?? 0))) * 100
    : (completed.length / Math.max(1, bookings.length)) * 100;
  const avgTicket = analytics
    ? Number(analytics.revenue) / Math.max(1, analytics.completed_count ?? 1)
    : completed.reduce((s, b) => s + b.price, 0) / Math.max(1, completed.length);
  const repeatRate =
    analytics && analytics.unique_clients
      ? ((analytics.returning_clients ?? 0) / analytics.unique_clients) * 100
      : (clients.filter((c) => c.visits >= 3).length / Math.max(1, clients.length)) * 100;
  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / Math.max(1, reviews.length);

  const topServices = analytics?.top_services?.length
    ? analytics.top_services.map((s) => ({ name: s.service_name, count: s.cnt }))
    : [];
  const maxCount = Math.max(1, ...topServices.map((s) => s.count));
  const topClients = [...clients].sort((a, b) => b.spent - a.spent).slice(0, 5);
  const dailyMax = Math.max(
    1,
    ...(analytics?.daily ?? []).map((d) => Number(d.revenue)),
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Statistika"
        description="Ish samaradorligingiz va ko'rsatkichlar."
        actions={
          <div className="inline-flex gap-1 bg-muted p-1 rounded-lg">
            {(["7d", "30d", "90d"] as RangeKey[]).map((k) => (
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
          label="Bronlarni yakunlash"
          value={`${completionRate.toFixed(0)}%`}
          hint={isLoading ? "Yuklanmoqda..." : undefined}
        />
        <StatCard
          icon={<CalendarClock className="size-4" />}
          label="O'rt. chek"
          value={formatUZS(avgTicket)}
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
      </div>

      <SectionCard title="Kunlik savdo" description="Tanlangan davr bo'yicha">
        <div className="flex items-end gap-1 h-40 overflow-x-auto pb-2">
          {(analytics?.daily ?? []).map((d) => {
            const h = Math.round((Number(d.revenue) / dailyMax) * 100);
            return (
              <div key={d.date} className="flex flex-col items-center gap-1 min-w-[28px]">
                <div
                  className="w-6 rounded-t bg-foreground/85"
                  style={{ height: `${Math.max(4, h)}%` }}
                  title={`${d.date}: ${formatUZS(Number(d.revenue))}`}
                />
                <span className="text-[9px] text-muted-foreground rotate-0">
                  {d.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
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
              <p className="text-sm text-muted-foreground">Ma'lumot yo'q.</p>
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

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          icon={<Users className="size-4" />}
          label="Noyob mijozlar"
          value={String(analytics?.unique_clients ?? "—")}
        />
        <StatCard
          icon={<Users className="size-4" />}
          label="Yangi mijozlar"
          value={String(analytics?.new_clients ?? "—")}
        />
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="Jami daromad"
          value={analytics ? formatUZS(Number(analytics.revenue)) : "—"}
        />
      </div>
    </div>
  );
}
