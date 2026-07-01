import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Calendar,
  Circle,
  Clock,
  Inbox,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { formatCancelCountdown } from "@mybarber/shared/booking-lifecycle";
import { formatUZS, type Booking } from "@/components/barber/BarberContext";
import { useLivePendingBarberResponse } from "@/components/bookings/BarberPendingResponseBanner";
import { StatusPill, UserAvatar } from "@/components/barber/primitives";
import { cn } from "@/lib/utils";
import { paymentLabel } from "@/lib/payment-label";
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

const STATUS_SORT_RANK: Record<Booking["status"], number> = {
  pending: 0,
  in_progress: 1,
  accepted: 2,
  completed: 3,
  cancelled: 4,
  rejected: 5,
};

function bookingCreatedMs(b: Booking): number {
  if (!b.created_at) return 0;
  const ms = new Date(b.created_at).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function bookingStartMs(b: Booking): number {
  if (!b.start_at) return 0;
  const ms = new Date(b.start_at).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/** Yangi so'rovlar birinchi, ichida eng yangisi yuqorida. */
function sortBookings(rows: Booking[]): Booking[] {
  return [...rows].sort((a, b) => {
    const rankDiff = STATUS_SORT_RANK[a.status] - STATUS_SORT_RANK[b.status];
    if (rankDiff !== 0) return rankDiff;

    if (a.status === "pending" && b.status === "pending") {
      return bookingCreatedMs(b) - bookingCreatedMs(a);
    }

    if (a.status === "in_progress" || a.status === "accepted") {
      return bookingStartMs(a) - bookingStartMs(b);
    }

    return bookingStartMs(b) - bookingStartMs(a);
  });
}

function partitionBookings(rows: Booking[], status: Status | "all") {
  if (status !== "all") {
    return { pending: [] as Booking[], rest: rows };
  }
  const pending = rows.filter((b) => b.status === "pending");
  const rest = rows.filter((b) => b.status !== "pending");
  return { pending, rest };
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

  const { pending: pendingRows, rest: restRows } = useMemo(
    () => partitionBookings(filtered, status),
    [filtered, status],
  );

  return (
    <div className="mx-auto max-w-[1300px] space-y-5 p-4 sm:space-y-6 sm:p-6 lg:p-8">
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
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition-colors focus:border-foreground/40"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatChip icon={Inbox} label="Yangi so'rovlar" value={counts.pending} highlight={counts.pending > 0} />
        <StatChip icon={Circle} label="Hozir kresloda" value={counts.in_progress} live />
        <StatChip icon={Calendar} label="Bugungi bronlar" value={counts.today} />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 lg:gap-1.5">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
            {TABS.map((t) => {
              const active = status === t.id;
              const count = counts[t.id];
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setStatus(t.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors",
                    active
                      ? "border-foreground bg-foreground font-medium text-background"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
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

        {isLoading ? (
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <BookingCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState status={status} hasQuery={query.trim().length > 0} />
        ) : (
          <div className="space-y-5">
            {pendingRows.length > 0 ? (
              <section className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
                    <span className="grid size-6 place-items-center rounded-md bg-foreground text-background">
                      <Sparkles className="size-3.5 stroke-[1.5]" />
                    </span>
                    Yangi so&apos;rovlar
                  </h2>
                  <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-background">
                    {pendingRows.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                  {pendingRows.map((b) => (
                    <BookingCard key={b.id} booking={b} isNew />
                  ))}
                </div>
              </section>
            ) : null}

            {restRows.length > 0 ? (
              <section className="space-y-2.5">
                {pendingRows.length > 0 ? (
                  <h2 className="px-0.5 font-heading text-sm font-semibold text-muted-foreground">
                    Boshqa bronlar
                  </h2>
                ) : null}
                <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                  {restRows.map((b) => (
                    <BookingCard key={b.id} booking={b} />
                  ))}
                </div>
              </section>
            ) : null}
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
  highlight,
  live,
}: {
  icon: typeof Inbox;
  label: string;
  value: number;
  highlight?: boolean;
  live?: boolean;
}) {
  const isLive = live && value > 0;
  const isHighlight = highlight && value > 0;
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
        isHighlight || isLive
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0 stroke-[1.5]",
          isHighlight || isLive ? "text-background/80" : "text-muted-foreground",
        )}
      />
      <p
        className={cn(
          "min-w-0 flex-1 truncate text-xs font-medium",
          isHighlight || isLive ? "text-background/75" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p className="font-heading text-xl font-semibold tabular-nums tracking-tight">{value}</p>
      {isLive ? (
        <span className="relative flex size-1.5 shrink-0">
          <span className="relative inline-flex size-1.5 rounded-full bg-background" />
        </span>
      ) : null}
    </div>
  );
}

function BookingCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-3.5 sm:p-4">
      <div className="flex items-center gap-3">
        <div className="size-10 shrink-0 rounded-lg bg-muted" />
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
    <div className="rounded-xl border border-border bg-card px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-lg border border-border bg-muted/50">
        <Calendar className="size-5 stroke-[1.5] text-muted-foreground" />
      </div>
      <h2 className="font-heading text-lg font-semibold text-foreground">Bronlar topilmadi</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function NewBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-background shadow-sm">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-background/70 opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-background" />
      </span>
      Yangi
    </span>
  );
}

function BookingCard({ booking: b, isNew }: { booking: Booking; isNew?: boolean }) {
  const isPending = b.status === "pending";
  const showNew = isNew ?? isPending;
  const response = useLivePendingBarberResponse(isPending ? b : null);

  return (
    <Link
      to="/barber/bookings/$bookingId"
      params={{ bookingId: b.id }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-colors",
        "[@media(hover:hover)]:hover:border-foreground/25 [@media(hover:hover)]:hover:bg-muted/30",
        showNew
          ? "border-foreground/30 shadow-[inset_3px_0_0_0_hsl(var(--foreground))]"
          : "border-border",
        b.status === "in_progress" && !showNew && "border-foreground/35",
      )}
    >
      <div className="flex items-center gap-3 p-3.5 sm:p-4">
        <div className="relative shrink-0">
          <UserAvatar
            src={b.client_avatar}
            name={b.client}
            className={cn("size-11 rounded-lg", showNew && "ring-2 ring-foreground/15")}
          />
          {showNew ? (
            <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-foreground text-[8px] font-bold text-background">
              !
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-heading text-base font-semibold text-foreground">
                  {b.client}
                </p>
                {showNew ? <NewBadge /> : null}
              </div>
            </div>
            {!showNew ? <StatusPill status={b.status} variant="mono" className="shrink-0" /> : null}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{b.service}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1 text-xs font-medium text-foreground/80">
              <Calendar className="size-3.5 stroke-[1.5] text-muted-foreground" />
              {b.date} · {b.time}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3 stroke-[1.5]" />
              {b.duration_min} daq
            </span>
            {b.payment_method ? (
              <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground/65">
                {paymentLabel(b.payment_method)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold tabular-nums text-foreground">{formatUZS(b.price)}</p>
        </div>
      </div>

      {showNew && response.secondsUntilExpiry != null && !response.expired ? (
        <div className="flex items-center justify-between gap-2 border-t border-foreground/10 bg-foreground px-3.5 py-2 text-xs font-medium text-background sm:px-4">
          <span>Qabul qilish vaqti</span>
          <span className="font-mono tabular-nums">
            {formatCancelCountdown(response.secondsUntilExpiry)}
          </span>
        </div>
      ) : null}

      {b.status === "in_progress" ? (
        <div className="flex items-center gap-2 border-t border-border bg-muted/40 px-3.5 py-2 text-xs font-medium text-foreground/80 sm:px-4">
          <span className="inline-flex size-1.5 shrink-0 rounded-full bg-foreground" />
          Xizmat davom etmoqda
        </div>
      ) : null}
    </Link>
  );
}
