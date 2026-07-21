import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  CalendarClock,
  TrendingUp,
  Users,
  Star,
  Play,
  ScanLine,
  CheckCircle2,
  ArrowRight,
  Package,
  Target,
  Image as ImageIcon,
  Receipt,
  AlertTriangle,
  Trophy,
} from "lucide-react";
import { useBarberContext, formatUZS } from "@/components/barber/BarberContext";
import { StatusPill, UserAvatar } from "@/components/barber/primitives";
import { getFlowMeta } from "@/lib/barber-flow-config";
import {
  bookingEarningsAt,
  isBookingScheduledToday,
  rangeToIsoParams,
} from "@/lib/finance-range";
import { isSameBarberDay } from "@/lib/barber-timezone";
import { cn } from "@/lib/utils";
import {
  prefetchBarberBookings,
  prefetchBarberFinance,
  useBarberBookingsQuery,
  useBarberFinanceQuery,
} from "@/hooks/use-barber-queries";
import { readOnboardingStatusCache } from "@/lib/onboarding-status-cache";

export const Route = createFileRoute("/barber/")({
  loader: ({ context: { queryClient } }) => {
    const cached = readOnboardingStatusCache();
    if (cached?.fully_ready !== true) return;
    void prefetchBarberBookings(queryClient);
    void prefetchBarberFinance(queryClient, rangeToIsoParams("Oy"));
    void prefetchBarberFinance(queryClient, rangeToIsoParams("Bugun"));
  },
  component: BarberDashboard,
});

function BarberDashboard() {
  const navigate = useNavigate();
  const {
    profile,
    onboardingComplete,
    reviews,
    clients,
    inventory,
    goals,
    portfolio,
    expenses,
    startBooking,
    viewMode,
    flowIdentity,
    fullyReady,
    activationHydrated,
  } = useBarberContext();

  const live = fullyReady && activationHydrated;
  const { data: bookings = [] } = useBarberBookingsQuery(live);
  const monthParams = useMemo(() => rangeToIsoParams("Oy"), []);
  const { data: monthFinance } = useBarberFinanceQuery(monthParams, live);

  /** Salon rejimida indeks — mustaqil dashboard emas, salon overview (ishchi «Barberga oʻtish» mustaqil rejimga o‘tkazadi). */
  if (onboardingComplete && viewMode === "salon") {
    return <Navigate to="/barber/salon-view" replace />;
  }

  const today = useMemo(
    () =>
      bookings
        .filter((b) => isBookingScheduledToday(b))
        .sort((a, b) => a.time.localeCompare(b.time)),
    [bookings],
  );

  const clientsToday = useMemo(() => {
    const ids = new Set(
      bookings
        .filter((b) => b.status === "completed" && isSameBarberDay(bookingEarningsAt(b)))
        .map((b) => b.customer_id)
        .filter(Boolean),
    );
    return ids.size;
  }, [bookings]);

  const localAllCompleted = useMemo(
    () => bookings.filter((b) => b.status === "completed"),
    [bookings],
  );
  const localAllCash = localAllCompleted
    .filter((b) => b.payment_method === "cash")
    .reduce((s, b) => s + b.price, 0);
  const localAllOnline = localAllCompleted
    .filter((b) => b.payment_method === "online")
    .reduce((s, b) => s + b.price, 0);
  const localAllTotal = localAllCash + localAllOnline;
  const apiAllTimeTotal = Number(monthFinance?.all_time_total_income ?? 0);
  const apiAllTimeCash = Number(monthFinance?.all_time_cash_total ?? 0);
  const apiAllTimeOnline = Number(monthFinance?.all_time_online_total ?? 0);
  const useLocalAllTime = apiAllTimeTotal <= 0 && localAllCompleted.length > 0;
  const allTimeCash = useLocalAllTime ? localAllCash : apiAllTimeCash;
  const allTimeOnline = useLocalAllTime ? localAllOnline : apiAllTimeOnline;
  const earnings = useLocalAllTime ? localAllTotal : apiAllTimeTotal;

  const active = bookings.find((b) => b.status === "in_progress");
  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / Math.max(1, reviews.length);
  const lowStock = inventory.filter((i) => i.stock <= i.min_stock);
  const activeGoals = goals.filter((g) => !g.done);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const flowMeta = getFlowMeta(flowIdentity);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            {flowMeta.heroTitle}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {flowMeta.heroSubtitle}
          </p>
        </div>
        <div className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", flowMeta.accentClass)}>
          {flowMeta.badge}
        </div>
      </div>

      {/* TOP boost CTA — empty calendar / growth */}
      {today.length === 0 ? (
        <Link
          to="/barber/marketing"
          className="flex flex-col gap-3 rounded-xl border border-foreground/15 bg-foreground p-5 text-background sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-60">Marketing</p>
            <p className="mt-1 font-heading text-lg font-semibold tracking-tight">
              Bugun bron yo‘q — TOP boost yoqing
            </p>
            <p className="mt-1 text-sm opacity-75">
              Xaritada yuqoriroq ko‘rinish · 99 000 so‘m / 7 kun
            </p>
          </div>
          <span className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-background px-4 text-sm font-bold text-foreground">
            Boost sotib ol
            <ArrowRight className="size-4" />
          </span>
        </Link>
      ) : (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Shu oy oqim</p>
            <p className="text-xs text-muted-foreground">
              {today.length} bugungi bron · {clients.length} mijoz bazada · reyting {avgRating.toFixed(1)}
            </p>
          </div>
          <Link
            to="/barber/marketing"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold hover:bg-muted"
          >
            TOP boost
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI
          icon={<CalendarClock className="size-4" />}
          label="Bugungi bronlar"
          value={today.length.toString()}
          hint={`${today.filter((b) => b.status === "pending" || b.status === "accepted").length} kutilmoqda`}
        />
        <KPI
          icon={<TrendingUp className="size-4" />}
          label="Daromad"
          value={formatUZS(earnings)}
          hint={`Butun davr · naqd ${formatUZS(allTimeCash)} · onlayn ${formatUZS(allTimeOnline)}`}
        />
        <KPI
          icon={<Users className="size-4" />}
          label="Mijozlar"
          value={clients.length.toString()}
          hint={`${clientsToday} bugun`}
        />
        <KPI
          icon={<Star className="size-4" />}
          label="O'rtacha reyting"
          value={avgRating.toFixed(1)}
          hint={`${reviews.length} sharh`}
        />
      </div>

      {/* Active session */}
      {active && (
        <div className="rounded-xl border border-foreground bg-foreground text-background p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <Link
            to="/barber/bookings/$bookingId"
            params={{ bookingId: active.id }}
            className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-90"
          >
            <UserAvatar
              src={active.client_avatar}
              name={active.client}
              className="size-12 ring-2 ring-background/30"
            />
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider opacity-70">Faol seans</div>
              <div className="font-heading font-medium truncate">{active.client}</div>
              <div className="text-sm opacity-80 truncate">
                {active.service} · {active.duration_min} daq
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() =>
              void navigate({
                to: "/barber/bookings/$bookingId",
                params: { bookingId: active.id },
                search: { finish: true },
              })
            }
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-background text-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <CheckCircle2 className="size-4" />
            Tugatish
          </button>
        </div>
      )}

      {/* Today bookings */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Bugungi jadval</h2>
          <Link
            to="/barber/bookings"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            Hammasi <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          {today.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Bugun bronlar yo'q.</div>
          ) : (
            today.map((b) => (
              <div
                key={b.id}
                className="p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className="text-center w-14 shrink-0">
                  <div className="font-heading font-semibold text-foreground">{b.time}</div>
                  <div className="text-[11px] text-muted-foreground">{b.duration_min}m</div>
                </div>
                <UserAvatar src={b.client_avatar} name={b.client} className="size-10" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{b.client}</div>
                  <div className="text-xs text-muted-foreground truncate">{b.service}</div>
                </div>
                <div className="hidden sm:block text-sm font-medium">{formatUZS(b.price)}</div>
                <StatusPill status={b.status} />
                {b.status === "accepted" &&
                  (b.checked_in_at ? (
                    <button
                      onClick={() => startBooking(b.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90"
                    >
                      <Play className="size-3" />
                      Boshlash
                    </button>
                  ) : (
                    <Link
                      to="/barber/bookings/$bookingId"
                      params={{ bookingId: b.id }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted"
                    >
                      <ScanLine className="size-3" />
                      QR tasdiqlash
                    </Link>
                  ))}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Goals + Inventory + Portfolio quick row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active goals */}
        <Link
          to="/barber/goals"
          className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-matte transition-shadow group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-lg bg-muted text-foreground flex items-center justify-center">
                <Target className="size-4" />
              </div>
              <h3 className="font-heading font-semibold">Maqsadlar</h3>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="space-y-2.5">
            {activeGoals.slice(0, 3).map((g) => {
              const pct = Math.min(100, Math.round((g.current / g.target) * 100));
              return (
                <div key={g.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="truncate text-muted-foreground">{g.title}</span>
                    <span className="font-medium tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Trophy className="size-3" />
            {goals.filter((g) => g.done).length} ta bajarilgan
          </div>
        </Link>

        {/* Inventory alerts */}
        <Link
          to="/barber/inventory"
          className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-matte transition-shadow group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-lg bg-muted text-foreground flex items-center justify-center">
                <Package className="size-4" />
              </div>
              <h3 className="font-heading font-semibold">Inventar</h3>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
          {lowStock.length === 0 ? (
            <div className="text-sm text-muted-foreground">Hammasi yetarli zaxirada.</div>
          ) : (
            <div className="space-y-2">
              {lowStock.slice(0, 3).map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="size-3.5 text-destructive shrink-0" />
                    <span className="truncate">{it.name}</span>
                  </div>
                  <span className="text-xs font-medium text-destructive shrink-0">
                    {it.stock}/{it.min_stock}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Receipt className="size-3" />
            {formatUZS(totalExpenses)} bu oy xarajat
          </div>
        </Link>

        {/* Portfolio preview */}
        <Link
          to="/barber/portfolio"
          className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-matte transition-shadow group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-lg bg-muted text-foreground flex items-center justify-center">
                <ImageIcon className="size-4" />
              </div>
              <h3 className="font-heading font-semibold">Portfolio</h3>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {portfolio.slice(0, 6).map((p) => (
              <div key={p.id} className="aspect-square rounded-md overflow-hidden bg-muted">
                <img src={p.image} alt="" className="size-full object-cover" />
              </div>
            ))}
          </div>
          <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="size-3" />
            {portfolio.length} ta ish · {portfolio.reduce((s, p) => s + p.likes, 0)} yoqtirish
          </div>
        </Link>
      </section>
    </div>
  );
}

function KPI({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-wider">{label}</span>
        <span>{icon}</span>
      </div>
      <div className="mt-2 font-heading text-2xl font-semibold text-foreground">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
