import { createFileRoute } from "@tanstack/react-router";
import { Users, Star, CalendarClock, TrendingUp, Repeat } from "lucide-react";
import { useBarberContext, formatUZS } from "@/components/barber/BarberContext";
import { PageHeader, StatCard, SectionCard } from "@/components/barber/primitives";

export const Route = createFileRoute("/barber/stats")({
  component: StatsPage,
});

function StatsPage() {
  const { bookings, clients, reviews, services } = useBarberContext();

  const completed = bookings.filter((b) => b.status === "completed");
  const cancelled = bookings.filter((b) => b.status === "cancelled");
  const completionRate = (completed.length / Math.max(1, bookings.length)) * 100;
  const avgTicket = completed.reduce((s, b) => s + b.price, 0) / Math.max(1, completed.length);
  const repeatRate = (clients.filter((c) => c.visits >= 3).length / Math.max(1, clients.length)) * 100;
  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / Math.max(1, reviews.length);

  // top services by frequency in bookings
  const serviceStats = services.map((s) => ({
    ...s,
    count: bookings.filter((b) => b.service === s.name || b.service.startsWith(s.name.split(" ")[0])).length,
  }));
  const maxCount = Math.max(1, ...serviceStats.map((s) => s.count));

  // top clients
  const topClients = [...clients].sort((a, b) => b.spent - a.spent).slice(0, 5);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader title="Statistika" description="Ish samaradorligingiz va ko'rsatkichlar." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<TrendingUp className="size-4" />} label="Yakunlash %" value={`${completionRate.toFixed(0)}%`} trend={{ value: 4 }} />
        <StatCard icon={<CalendarClock className="size-4" />} label="O'rt. chek" value={formatUZS(avgTicket)} trend={{ value: 8 }} />
        <StatCard icon={<Repeat className="size-4" />} label="Qaytuvchi mijoz" value={`${repeatRate.toFixed(0)}%`} trend={{ value: 3 }} />
        <StatCard icon={<Star className="size-4" />} label="O'rt. reyting" value={avgRating.toFixed(1)} hint={`${reviews.length} sharh`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Eng mashhur xizmatlar" description="Bronlar bo'yicha">
          <div className="space-y-3">
            {serviceStats.map((s) => (
              <div key={s.id}>
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
          </div>
        </SectionCard>

        <SectionCard title="VIP mijozlar" description="Sarflagan summa bo'yicha">
          <div className="space-y-3">
            {topClients.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <div className="size-7 rounded-full bg-muted text-foreground text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </div>
                <img src={c.avatar} alt="" className="size-9 rounded-full" />
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

      <SectionCard title="Umumiy ko'rsatkichlar">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metric icon={<CalendarClock className="size-4" />} label="Jami bronlar" value={bookings.length} />
          <Metric icon={<TrendingUp className="size-4" />} label="Yakunlangan" value={completed.length} />
          <Metric icon={<Users className="size-4" />} label="Mijozlar" value={clients.length} />
          <Metric icon={<Star className="size-4" />} label="Bekor qilinganlar" value={cancelled.length} />
        </div>
      </SectionCard>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="font-heading text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
