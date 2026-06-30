import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarX,
  Clock,
  Flame,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { formatUZS, type Booking } from "@/components/barber/BarberContext";
import { StatusPill, UserAvatar } from "@/components/barber/primitives";
import { cn } from "@/lib/utils";
import { paymentBadgeClass, paymentLabel } from "@/lib/payment-label";
import { useBarberBookingsQuery } from "@/hooks/use-barber-queries";

export const Route = createFileRoute("/barber/bookings")({
  component: BookingsRoute,
});

function BookingsRoute() {
  const detailMatch = useMatch({
    from: "/barber/bookings/$bookingId",
    shouldThrow: false,
  });
  if (detailMatch) return <Outlet />;
  return <BookingsList />;
}

type Status = Booking["status"];

const TABS: { id: Status | "all"; label: string }[] = [
  { id: "all", label: "Hammasi" },
  { id: "pending", label: "Yangi" },
  { id: "accepted", label: "Tasdiqlangan" },
  { id: "in_progress", label: "Davom etmoqda" },
  { id: "completed", label: "Yakunlangan" },
  { id: "cancelled", label: "Bekor" },
  { id: "rejected", label: "Rad etilgan" },
];

function groupCounts(bookings: Booking[]) {
  return {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    accepted: bookings.filter((b) => b.status === "accepted").length,
    in_progress: bookings.filter((b) => b.status === "in_progress").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
    rejected: bookings.filter((b) => b.status === "rejected").length,
    today: bookings.filter((b) => b.date === "Bugun").length,
  };
}

function sortBookings(rows: Booking[]): Booking[] {
  const rank = (b: Booking) => {
    if (b.status === "pending") return 0;
    if (b.status === "in_progress") return 1;
    if (b.date === "Bugun") return 2;
    return 3;
  };
  return [...rows].sort((a, b) => rank(a) - rank(b));
}

function BookingsList() {
  const { data: bookings = [], isLoading, isFetching } = useBarberBookingsQuery();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");

  const counts = useMemo(() => groupCounts(bookings), [bookings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = bookings.filter(
      (b) =>
        (status === "all" || b.status === status) &&
        (!q || b.client.toLowerCase().includes(q) || b.service.toLowerCase().includes(q)),
    );
    return sortBookings(rows);
  }, [bookings, status, query]);

  return (
    <div className="mx-auto max-w-[1300px] space-y-5 p-4 sm:space-y-6 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Bronlar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bronni ochsangiz, jarayon va taymerni boshqarasiz.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:w-80 lg:items-end">
          {isFetching && !isLoading ? (
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex">
              <Loader2 className="size-3 animate-spin" />
              Yangilanmoqda…
            </span>
          ) : null}
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Mijoz yoki xizmat bo'yicha qidirish"
              className="h-11 w-full rounded-2xl border border-border bg-card pl-10 pr-4 text-sm shadow-card outline-none transition-shadow focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatChip
          icon={Sparkles}
          label="Yangi so'rovlar"
          value={counts.pending}
          accent={counts.pending > 0}
        />
        <StatChip icon={Flame} label="Hozir kresloda" value={counts.in_progress} live />
        <StatChip icon={CalendarDays} label="Bugungi bronlar" value={counts.today} />
      </div>

      {/* Main content */}
      <div className="space-y-4">
        {/* Status tabs */}
          <div className="flex flex-wrap gap-2 lg:gap-1.5">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
              {TABS.map((t) => {
                const active = status === t.id;
                const count = counts[t.id];
                const isCancel = t.id === "cancelled" || t.id === "rejected";
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setStatus(t.id)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-all duration-200",
                      active
                        ? "border-foreground bg-foreground font-medium text-background shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
                      !active && isCancel && "text-destructive/80 hover:text-destructive",
                    )}
                  >
                    {t.label}
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                        active ? "bg-background/20 text-background" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <BookingCardSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState status={status} hasQuery={query.trim().length > 0} />
          ) : (
            <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
              {filtered.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </div>
          )}
        </div>
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  accent,
  live,
}: {
  icon: typeof Clock;
  label: string;
  value: number;
  accent?: boolean;
  live?: boolean;
}) {
  const isLive = live && value > 0;
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 shadow-card transition-colors",
        isLive
          ? "bg-[#2B59FF] text-white"
          : accent
            ? "bg-amber-500/10"
            : "bg-card",
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", isLive ? "text-white/90" : "text-muted-foreground")}
      />
      <p
        className={cn(
          "min-w-0 flex-1 truncate text-xs font-medium",
          isLive ? "text-white/80" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "font-heading text-xl font-semibold tabular-nums tracking-tight",
          isLive ? "text-white" : "text-foreground",
        )}
      >
        {value}
      </p>
      {isLive ? (
        <span className="relative flex size-2 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/70 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-white" />
        </span>
      ) : null}
    </div>
  );
}

function BookingCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-card p-3.5 shadow-card sm:p-4">
      <div className="flex items-center gap-3">
        <div className="size-10 shrink-0 rounded-xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded-md bg-muted" />
          <div className="h-3 w-1/2 rounded-md bg-muted" />
        </div>
        <div className="h-8 w-16 rounded-md bg-muted" />
      </div>
    </div>
  );
}

function EmptyState({ status, hasQuery }: { status: Status | "all"; hasQuery: boolean }) {
  const tabLabel = TABS.find((t) => t.id === status)?.label ?? "Hammasi";
  const description = hasQuery
    ? "Boshqa kalit so'z bilan qidiring yoki filterni o'zgartiring."
    : status === "all"
      ? "Yangi bronlar kelganda shu yerda ko'rinadi."
      : `"${tabLabel}" holatidagi bronlar hozircha yo'q.`;

  return (
    <div className="rounded-2xl bg-card px-6 py-14 text-center shadow-card">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted">
        <CalendarX className="size-6 text-muted-foreground" />
      </div>
      <h2 className="font-heading text-lg font-semibold text-foreground">Bronlar topilmadi</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function BookingCard({ booking: b }: { booking: Booking }) {
  return (
    <Link
      to="/barber/bookings/$bookingId"
      params={{ bookingId: b.id }}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl bg-card shadow-card transition-all duration-200",
        "[@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-lg",
        b.status === "pending" && "bg-amber-500/[0.07]",
        b.status === "in_progress" && "bg-emerald-500/[0.06]",
      )}
    >
      <div className="flex items-center gap-3 p-3.5 sm:p-4">
        <UserAvatar
          src={b.client_avatar}
          name={b.client}
          className="size-11 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-heading text-base font-semibold text-foreground">
              {b.client}
            </p>
            <StatusPill status={b.status} className="shrink-0" />
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{b.service}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1 text-xs font-medium text-foreground">
              <CalendarDays className="size-3.5 text-muted-foreground" />
              {b.date} · {b.time}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {b.duration_min} daq
            </span>
            {b.payment_method ? (
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  paymentBadgeClass(b.payment_method),
                )}
              >
                {paymentLabel(b.payment_method)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold tabular-nums text-foreground">{formatUZS(b.price)}</p>
        </div>
      </div>

      {b.status === "in_progress" ? (
        <div className="flex items-center gap-2 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 sm:px-4">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Xizmat davom etmoqda
        </div>
      ) : null}
    </Link>
  );
}
