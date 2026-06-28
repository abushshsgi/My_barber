import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CalendarClock,
  ChevronRight,
  Clock,
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
  component: BookingsPage,
});

const TABS = [
  { id: "all", label: "Hammasi" },
  { id: "pending", label: "Yangi" },
  { id: "accepted", label: "Tasdiqlangan" },
  { id: "in_progress", label: "Davom etmoqda" },
  { id: "completed", label: "Yakunlangan" },
  { id: "cancelled", label: "Bekor" },
  { id: "rejected", label: "Rad etilgan" },
] as const;

const STATUS_ACCENT: Partial<Record<Booking["status"], string>> = {
  pending: "border-l-amber-400",
  accepted: "border-l-foreground",
  in_progress: "border-l-emerald-500",
  completed: "border-l-muted-foreground/40",
  cancelled: "border-l-destructive/50",
  rejected: "border-l-destructive/50",
};

function BookingsPage() {
  const { data: bookings = [], isLoading, isFetching } = useBarberBookingsQuery();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let rows = tab === "all" ? bookings : bookings.filter((b) => b.status === tab);
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (b) => b.client.toLowerCase().includes(q) || b.service.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [bookings, tab, query]);

  const stats = useMemo(
    () => ({
      pending: bookings.filter((b) => b.status === "pending").length,
      active: bookings.filter((b) => b.status === "in_progress").length,
      today: bookings.filter((b) => b.date === "Bugun").length,
    }),
    [bookings],
  );

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            Bronlar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Har bir bronni bosing — jarayon va taymer alohida sahifada.
            {isFetching && !isLoading ? (
              <span className="ml-2 text-xs">Yangilanmoqda…</span>
            ) : null}
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mijoz yoki xizmat bo'yicha qidirish"
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatChip
          icon={Sparkles}
          label="Yangi so'rovlar"
          value={stats.pending}
          tone={stats.pending > 0 ? "warm" : "muted"}
        />
        <StatChip icon={Clock} label="Hozir kresloda" value={stats.active} tone="live" />
        <StatChip icon={CalendarClock} label="Bugungi bronlar" value={stats.today} />
      </div>

      <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors sm:px-4",
              tab === t.id
                ? "bg-background font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span className="ml-1.5 text-xs opacity-60">
              {t.id === "all" ? bookings.length : bookings.filter((b) => b.status === t.id).length}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-border bg-card">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-14 text-center">
          <CalendarClock className="mx-auto mb-3 size-10 text-muted-foreground/60" />
          <p className="font-medium text-foreground">Bu kategoriyada bronlar yo'q</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Yangi bronlar kelganda shu yerda ko'rinadi.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  tone = "muted",
}: {
  icon: typeof Clock;
  label: string;
  value: number;
  tone?: "muted" | "warm" | "live";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-card",
        tone === "warm" && value > 0 && "border-amber-200/80 bg-amber-50/50 dark:bg-amber-950/20",
        tone === "live" && value > 0 && "border-emerald-200/80 bg-emerald-50/40 dark:bg-emerald-950/20",
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
        <Icon className="size-4 text-foreground/80" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-heading text-xl font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function BookingCard({ booking: b }: { booking: Booking }) {
  return (
    <Link
      to="/barber/bookings/$bookingId"
      params={{ bookingId: b.id }}
      className={cn(
        "group flex flex-col gap-4 rounded-2xl border border-border border-l-4 bg-card p-4 shadow-card transition-all hover:border-foreground/25 hover:shadow-md sm:p-5",
        STATUS_ACCENT[b.status] ?? "border-l-border",
        b.status === "in_progress" && "ring-1 ring-emerald-500/20",
      )}
    >
      <div className="flex items-start gap-3">
        <UserAvatar src={b.client_avatar} name={b.client} className="size-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold">{b.client}</p>
              <p className="truncate text-sm text-muted-foreground">{b.service}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusPill status={b.status} />
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                paymentBadgeClass(b.payment_method),
              )}
            >
              {paymentLabel(b.payment_method)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarClock className="size-3.5" />
          <span className="font-medium text-foreground">
            {b.date} · {b.time}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{b.duration_min} daq</span>
          <span className="font-semibold tabular-nums">{formatUZS(b.price)}</span>
        </div>
      </div>

      {b.status === "in_progress" ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Xizmat davom etmoqda — taymerni ko'rish uchun bosing
        </div>
      ) : null}
    </Link>
  );
}
