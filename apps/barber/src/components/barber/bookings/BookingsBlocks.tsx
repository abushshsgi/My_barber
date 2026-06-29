import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarClock,
  ChevronRight,
  Clock,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import type { Booking } from "@/components/barber/BarberContext";
import { formatUZS } from "@/components/barber/BarberContext";
import { StatusPill, UserAvatar } from "@/components/barber/primitives";
import { paymentBadgeClass, paymentLabel } from "@/lib/payment-label";
import { cn } from "@/lib/utils";
import { BOOKINGS_TABS, type BookingsPageState } from "./use-bookings-page";

const STATUS_ACCENT: Partial<Record<Booking["status"], string>> = {
  pending: "border-l-amber-400",
  accepted: "border-l-foreground",
  in_progress: "border-l-emerald-500",
  completed: "border-l-muted-foreground/40",
  cancelled: "border-l-destructive/50",
  rejected: "border-l-destructive/50",
};

export function BookingsPageHeader({ state }: { state: BookingsPageState }) {
  const { isFetching, isLoading } = state;
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">Bronlar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Har bir bronni bosing — jarayon va taymer alohida sahifada.
          {isFetching && !isLoading ? <span className="ml-2 text-xs">Yangilanmoqda…</span> : null}
        </p>
      </div>
      <BookingsSearch state={state} className="w-full sm:w-80" />
    </div>
  );
}

export function BookingsSearch({
  state,
  className,
  variant = "default",
}: {
  state: BookingsPageState;
  className?: string;
  variant?: "default" | "pill" | "underline";
}) {
  const inputClass =
    variant === "pill"
      ? "h-10 w-full rounded-full border border-border bg-muted/40 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
      : variant === "underline"
        ? "h-10 w-full border-0 border-b border-border bg-transparent pl-10 pr-0 text-sm outline-none focus:border-foreground"
        : "h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={state.query}
        onChange={(e) => state.setQuery(e.target.value)}
        placeholder="Mijoz yoki xizmat bo'yicha qidirish"
        className={inputClass}
      />
    </div>
  );
}

export function BookingsStatChips({ state, compact }: { state: BookingsPageState; compact?: boolean }) {
  const { stats } = state;
  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-1" : "sm:grid-cols-3")}>
      <StatChip icon={Sparkles} label="Yangi so'rovlar" value={stats.pending} tone={stats.pending > 0 ? "warm" : "muted"} />
      <StatChip icon={Clock} label="Hozir kresloda" value={stats.active} tone="live" />
      <StatChip icon={CalendarClock} label="Bugungi bronlar" value={stats.today} />
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

export function BookingsTabs({
  state,
  variant = "pills",
}: {
  state: BookingsPageState;
  variant?: "pills" | "underline" | "segmented";
}) {
  const wrapClass =
    variant === "underline"
      ? "flex max-w-full gap-4 overflow-x-auto border-b border-border"
      : variant === "segmented"
        ? "grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/30 p-1 sm:grid-cols-4 lg:grid-cols-7"
        : "inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/50 p-1";

  return (
    <div className={wrapClass}>
      {BOOKINGS_TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => state.setTab(t.id)}
          className={cn(
            "whitespace-nowrap text-sm transition-colors",
            variant === "underline" &&
              cn(
                "border-b-2 px-1 pb-2.5",
                state.tab === t.id
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              ),
            variant === "segmented" &&
              cn(
                "rounded-lg px-2 py-2",
                state.tab === t.id
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              ),
            variant === "pills" &&
              cn(
                "rounded-lg px-3 py-2 sm:px-4",
                state.tab === t.id
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              ),
          )}
        >
          {t.label}
          <span className="ml-1.5 text-xs opacity-60">{state.tabCount(t.id)}</span>
        </button>
      ))}
    </div>
  );
}

export function BookingsLoading() {
  return (
    <div className="flex h-48 items-center justify-center rounded-2xl border border-border bg-card">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function BookingsEmpty() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-14 text-center">
      <CalendarClock className="mx-auto mb-3 size-10 text-muted-foreground/60" />
      <p className="font-medium text-foreground">Bu kategoriyada bronlar yo&apos;q</p>
      <p className="mt-1 text-sm text-muted-foreground">Yangi bronlar kelganda shu yerda ko&apos;rinadi.</p>
    </div>
  );
}

export function BookingsListBody({
  state,
  variant = "cards",
}: {
  state: BookingsPageState;
  variant?: "cards" | "compact" | "rows" | "table";
}) {
  if (state.isLoading) return <BookingsLoading />;
  if (state.filtered.length === 0) return <BookingsEmpty />;

  if (variant === "table") {
    return (
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Mijoz</th>
              <th className="px-4 py-3 font-semibold">Xizmat</th>
              <th className="px-4 py-3 font-semibold">Vaqt</th>
              <th className="px-4 py-3 font-semibold">Holat</th>
              <th className="px-4 py-3 font-semibold text-right">Narx</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {state.filtered.map((b) => (
              <BookingTableRow key={b.id} booking={b} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const gridClass =
    variant === "compact"
      ? "flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card"
      : variant === "rows"
        ? "space-y-2"
        : "grid gap-3 lg:grid-cols-2";

  return (
    <div className={gridClass}>
      {state.filtered.map((b) => (
        <BookingCard key={b.id} booking={b} density={variant === "compact" ? "compact" : "default"} />
      ))}
    </div>
  );
}

function BookingTableRow({ booking: b }: { booking: Booking }) {
  return (
    <tr className="group hover:bg-muted/30">
      <td className="px-4 py-3">
        <Link to="/barber/bookings/$bookingId" params={{ bookingId: b.id }} className="flex items-center gap-2 font-medium">
          <UserAvatar src={b.client_avatar} name={b.client} className="size-8" />
          {b.client}
        </Link>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{b.service}</td>
      <td className="px-4 py-3 tabular-nums">
        {b.date} · {b.time}
      </td>
      <td className="px-4 py-3">
        <StatusPill status={b.status} />
      </td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatUZS(b.price)}</td>
    </tr>
  );
}

export function BookingCard({
  booking: b,
  density = "default",
}: {
  booking: Booking;
  density?: "default" | "compact" | "large";
}) {
  return (
    <Link
      to="/barber/bookings/$bookingId"
      params={{ bookingId: b.id }}
      className={cn(
        "group flex flex-col gap-4 border border-border bg-card transition-all hover:border-foreground/25 hover:shadow-md",
        density === "compact"
          ? "flex-row items-center gap-3 border-0 border-l-4 p-3 sm:p-4"
          : density === "large"
            ? "rounded-3xl border-l-4 p-6 shadow-card"
            : "rounded-2xl border-l-4 p-4 shadow-card sm:p-5",
        STATUS_ACCENT[b.status] ?? "border-l-border",
        b.status === "in_progress" && "ring-1 ring-emerald-500/20",
      )}
    >
      <div className={cn("flex items-start gap-3", density === "compact" && "min-w-0 flex-1")}>
        <UserAvatar
          src={b.client_avatar}
          name={b.client}
          className={cn("shrink-0", density === "large" ? "size-14" : "size-12")}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={cn("truncate font-semibold", density === "large" && "text-lg")}>{b.client}</p>
              <p className="truncate text-sm text-muted-foreground">{b.service}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          {density !== "compact" ? (
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
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <StatusPill status={b.status} />
            </div>
          )}
        </div>
        {density === "compact" ? (
          <span className="shrink-0 font-semibold tabular-nums">{formatUZS(b.price)}</span>
        ) : null}
      </div>

      {density !== "compact" ? (
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
      ) : null}

      {b.status === "in_progress" && density !== "compact" ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Xizmat davom etmoqda — taymerni ko&apos;rish uchun bosing
        </div>
      ) : null}
    </Link>
  );
}

export function BookingsKanban({ state }: { state: BookingsPageState }) {
  if (state.isLoading) return <BookingsLoading />;
  const groups = BOOKINGS_TABS.filter((t) => t.id !== "all").map((t) => ({
    ...t,
    items: state.filtered.filter((b) => b.status === t.id),
  }));

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {groups.map((col) => (
        <div key={col.id} className="w-[280px] shrink-0 rounded-2xl border border-border bg-muted/20 p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">{col.label}</p>
            <span className="rounded-full bg-background px-2 py-0.5 text-xs tabular-nums">{col.items.length}</span>
          </div>
          <div className="space-y-2">
            {col.items.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Bo&apos;sh</p>
            ) : (
              col.items.map((b) => <BookingCard key={b.id} booking={b} density="compact" />)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BookingsSidebarFilters({
  state,
  children,
}: {
  state: BookingsPageState;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <BookingsSearch state={state} />
        <BookingsStatChips state={state} compact />
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Holat</p>
          <div className="flex flex-col gap-1">
            {BOOKINGS_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => state.setTab(t.id)}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  state.tab === t.id ? "bg-foreground text-background" : "hover:bg-muted",
                )}
              >
                {t.label}
                <span className="text-xs opacity-70">{state.tabCount(t.id)}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function BookingsLayoutSwitcher({ current }: { current: import("./types").BookingsLayoutId }) {
  const navigate = useNavigate();
  const LABELS: Record<import("./types").BookingsLayoutId, string> = {
    1: "Classic",
    2: "Studio",
    3: "Compact",
    4: "Cards",
    5: "Split",
    6: "Stack",
    7: "Sidebar",
    8: "Kanban",
    9: "Table",
    10: "Minimal",
  };

  return (
    <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Bronlar dizayni — yoqqanini tanlang
      </p>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(LABELS) as unknown as import("./types").BookingsLayoutId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() =>
              void navigate({
                to: "/barber/bookings",
                search: { layout: id },
                replace: true,
              })
            }
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
              current === id
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-foreground hover:border-foreground/50",
            )}
          >
            {id}. {LABELS[id]}
          </button>
        ))}
      </div>
    </div>
  );
}
