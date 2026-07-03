import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Users,
} from "lucide-react";
import { formatUZS, type Booking } from "@/components/barber/BarberContext";
import { PageHeader, StatusPill, UserAvatar } from "@/components/barber/primitives";
import { useBarberBookingsQuery } from "@/hooks/use-barber-queries";
import { isBookingScheduledToday } from "@/lib/finance-range";
import {
  bookingBlockStyle,
  buildCalendarWeek,
  CALENDAR_END_HOUR,
  CALENDAR_PX_PER_HOUR,
  CALENDAR_START_HOUR,
  filterBookingsForWeek,
  formatWeekRangeLabel,
  groupBookingsByDay,
} from "@/lib/calendar-week";
import { todayKeyInBarberTz } from "@/lib/barber-timezone";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barber/calendar")({
  component: CalendarPage,
});

const HOUR_LABELS = Array.from(
  { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR },
  (_, i) => CALENDAR_START_HOUR + i,
);

const GRID_HEIGHT = (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * CALENDAR_PX_PER_HOUR;

const STATUS_BLOCK: Record<Booking["status"], string> = {
  pending: "border-foreground/25 bg-muted/90 text-foreground",
  accepted: "border-foreground/35 bg-foreground/10 text-foreground",
  in_progress: "border-foreground bg-foreground text-background shadow-sm",
  completed: "border-border bg-muted/50 text-muted-foreground",
  cancelled: "border-border bg-muted/40 text-muted-foreground",
  rejected: "border-border bg-muted/40 text-muted-foreground",
};

function CalendarPage() {
  const { data: bookings = [], isLoading, isFetching } = useBarberBookingsQuery();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayKey, setSelectedDayKey] = useState(() => todayKeyInBarberTz());

  const weekDays = useMemo(() => buildCalendarWeek(weekOffset), [weekOffset]);
  const weekLabel = useMemo(() => formatWeekRangeLabel(weekDays), [weekDays]);

  const weekBookings = useMemo(
    () => filterBookingsForWeek(bookings, weekDays),
    [bookings, weekDays],
  );
  const byDay = useMemo(
    () => groupBookingsByDay(weekBookings, weekDays),
    [weekBookings, weekDays],
  );

  const todayBookings = useMemo(
    () =>
      bookings
        .filter((b) => isBookingScheduledToday(b))
        .sort((a, b) => a.time.localeCompare(b.time)),
    [bookings],
  );

  const selectedDay = weekDays.find((d) => d.key === selectedDayKey) ?? weekDays[0];
  const selectedBookings = selectedDay ? (byDay.get(selectedDay.key) ?? []) : [];

  const goToday = () => {
    setWeekOffset(0);
    setSelectedDayKey(todayKeyInBarberTz());
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-4 sm:space-y-6 sm:p-6 lg:p-8">
      <PageHeader
        title="Kalendar"
        description="Haftalik jadval — bron qilgan mijozlar va vaqtlar."
        actions={
          <Link
            to="/barber/bookings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
          >
            Barcha bronlar
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatChip
          icon={CalendarDays}
          label="Shu hafta"
          value={weekBookings.length}
        />
        <StatChip
          icon={Users}
          label="Bugungi mijozlar"
          value={todayBookings.length}
          highlight={todayBookings.length > 0}
        />
        <StatChip
          icon={Clock}
          label="Hozir kresloda"
          value={bookings.filter((b) => b.status === "in_progress").length}
          live
        />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w - 1)}
            className="flex size-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted"
            aria-label="Oldingi hafta"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="flex size-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted"
            aria-label="Keyingi hafta"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="min-w-0 px-1">
            <p className="font-heading text-sm font-semibold sm:text-base">{weekLabel}</p>
            <p className="text-xs text-muted-foreground">
              {weekOffset === 0 ? "Bu hafta" : weekOffset > 0 ? `+${weekOffset} hafta` : `${weekOffset} hafta`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading ? (
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <Loader2 className="size-3 animate-spin" />
              Yangilanmoqda…
            </span>
          ) : null}
          <button
            type="button"
            onClick={goToday}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              weekOffset === 0
                ? "border-foreground/20 bg-muted text-foreground"
                : "border-border hover:bg-muted/50",
            )}
          >
            Bugun
          </button>
        </div>
      </div>

      {/* Mobile day picker */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:hidden">
        {weekDays.map((day) => {
          const count = byDay.get(day.key)?.length ?? 0;
          const active = selectedDayKey === day.key;
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => setSelectedDayKey(day.key)}
              className={cn(
                "flex min-w-[3.25rem] shrink-0 flex-col items-center rounded-xl border px-2 py-2 transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : day.isToday
                    ? "border-foreground/30 bg-foreground/5"
                    : "border-border bg-card",
              )}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
                {day.weekdayLabel}
              </span>
              <span className="font-heading text-lg font-semibold tabular-nums">{day.dayNum}</span>
              {count > 0 ? (
                <span
                  className={cn(
                    "mt-0.5 rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                    active ? "bg-background/20 text-background" : "bg-foreground text-background",
                  )}
                >
                  {count}
                </span>
              ) : (
                <span className="mt-0.5 h-4" />
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <CalendarSkeleton />
      ) : (
        <>
          {/* Desktop week grid */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-card lg:block">
            <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-border bg-muted/30">
              <div className="px-2 py-3" />
              {weekDays.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedDayKey(day.key)}
                  className={cn(
                    "border-l border-border px-2 py-3 text-center transition-colors",
                    day.isToday && "bg-foreground text-background",
                    selectedDayKey === day.key && !day.isToday && "bg-muted/60",
                  )}
                >
                  <div className="text-[10px] font-medium uppercase tracking-wider opacity-80">
                    {day.weekdayLabel}
                  </div>
                  <div className="font-heading text-lg font-semibold tabular-nums">{day.dayNum}</div>
                  <div className="text-[10px] capitalize opacity-70">{day.monthShort}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
              <div className="relative border-r border-border" style={{ height: GRID_HEIGHT }}>
                {HOUR_LABELS.map((h) => (
                  <div
                    key={h}
                    className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground"
                    style={{ top: (h - CALENDAR_START_HOUR) * CALENDAR_PX_PER_HOUR }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {weekDays.map((day) => {
                const dayBookings = byDay.get(day.key) ?? [];
                return (
                  <div
                    key={day.key}
                    className={cn(
                      "relative border-l border-border",
                      day.isToday && "bg-foreground/[0.02]",
                      selectedDayKey === day.key && "ring-1 ring-inset ring-foreground/15",
                    )}
                    style={{ height: GRID_HEIGHT }}
                  >
                    {HOUR_LABELS.map((h) => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-t border-border/60"
                        style={{ top: (h - CALENDAR_START_HOUR) * CALENDAR_PX_PER_HOUR }}
                      />
                    ))}

                    {dayBookings.map((b) => {
                      const block = bookingBlockStyle(b);
                      if (!block) return null;
                      return (
                        <CalendarBookingBlock
                          key={b.id}
                          booking={b}
                          style={block}
                          compact={block.height < 44}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile timeline for selected day */}
          <div className="space-y-3 lg:hidden">
            <h2 className="px-0.5 font-heading text-sm font-semibold text-foreground">
              {selectedDay
                ? `${selectedDay.weekdayLabel}, ${selectedDay.dayNum} ${selectedDay.monthShort}`
                : "Tanlangan kun"}
            </h2>
            {selectedBookings.length === 0 ? (
              <EmptyDayState />
            ) : (
              <div className="space-y-2">
                {selectedBookings.map((b) => (
                  <DayBookingRow key={b.id} booking={b} />
                ))}
              </div>
            )}
          </div>

          {/* Selected day detail (desktop sidebar-style list) */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-heading text-lg font-semibold">
                {selectedDay?.isToday
                  ? "Bugungi bronlar"
                  : selectedDay
                    ? `${selectedDay.dayNum} ${selectedDay.monthShort} bronlari`
                    : "Bronlar"}
              </h2>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                {selectedBookings.length}
              </span>
            </div>
            {selectedBookings.length === 0 ? (
              <EmptyDayState />
            ) : (
              <div className="space-y-1.5">
                {selectedBookings.map((b) => (
                  <DayBookingRow key={b.id} booking={b} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
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
  icon: typeof CalendarDays;
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
        "flex items-center gap-2.5 rounded-xl border px-3 py-2.5",
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
      <p className="font-heading text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function CalendarBookingBlock({
  booking: b,
  style,
  compact,
}: {
  booking: Booking;
  style: { top: number; height: number };
  compact?: boolean;
}) {
  return (
    <Link
      to="/barber/bookings/$bookingId"
      params={{ bookingId: b.id }}
      title={`${b.client} — ${b.service}`}
      className={cn(
        "absolute inset-x-1 z-10 overflow-hidden rounded-md border px-1.5 py-1 transition-opacity hover:z-20 hover:opacity-95",
        STATUS_BLOCK[b.status],
        b.status === "in_progress" && "ring-1 ring-background/30",
      )}
      style={{ top: style.top, height: style.height }}
    >
      <div className="flex h-full min-h-0 items-start gap-1.5">
        <UserAvatar
          src={b.client_avatar}
          name={b.client}
          className={cn("shrink-0 rounded", compact ? "size-5" : "size-6")}
        />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate font-medium leading-tight", compact ? "text-[10px]" : "text-xs")}>
            {b.client}
          </p>
          {!compact ? (
            <p className="truncate text-[10px] opacity-75">{b.service}</p>
          ) : null}
          <p className={cn("tabular-nums opacity-80", compact ? "text-[9px]" : "text-[10px]")}>
            {b.time}
            {!compact ? ` · ${b.duration_min} daq` : null}
          </p>
        </div>
      </div>
    </Link>
  );
}

function DayBookingRow({ booking: b }: { booking: Booking }) {
  return (
    <Link
      to="/barber/bookings/$bookingId"
      params={{ bookingId: b.id }}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:bg-muted/40",
        b.status === "in_progress"
          ? "border-foreground/35 bg-foreground/[0.03]"
          : "border-border bg-card",
      )}
    >
      <div className="w-12 shrink-0 text-center">
        <p className="font-heading text-sm font-semibold tabular-nums">{b.time}</p>
        <p className="text-[10px] text-muted-foreground">{b.duration_min} daq</p>
      </div>
      <UserAvatar src={b.client_avatar} name={b.client} className="size-10 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{b.client}</p>
        <p className="truncate text-xs text-muted-foreground">{b.service}</p>
      </div>
      <div className="hidden shrink-0 text-sm sm:block">{formatUZS(b.price)}</div>
      <StatusPill status={b.status} variant="mono" className="shrink-0" />
    </Link>
  );
}

function EmptyDayState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
      <CalendarDays className="mx-auto mb-2 size-8 stroke-[1.5] text-muted-foreground/60" />
      <p className="text-sm font-medium text-foreground">Bu kunda bron yo&apos;q</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Yangi bronlar kelganda shu yerda ko&apos;rinadi.
      </p>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="hidden h-[520px] rounded-xl border border-border bg-card lg:block" />
      <div className="h-40 rounded-xl border border-border bg-card lg:hidden" />
      <div className="h-48 rounded-xl border border-border bg-card" />
    </div>
  );
}
