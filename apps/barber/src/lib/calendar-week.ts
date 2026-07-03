import type { Booking } from "@/components/barber/BarberContext";
import { BARBER_TIME_ZONE, dateKeyInBarberTz, todayKeyInBarberTz } from "@/lib/barber-timezone";

export const CALENDAR_START_HOUR = 8;
export const CALENDAR_END_HOUR = 20;
export const CALENDAR_PX_PER_HOUR = 56;

const WEEKDAY_LABELS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"] as const;

export type CalendarWeekDay = {
  key: string;
  weekdayLabel: string;
  dayNum: number;
  monthShort: string;
  isToday: boolean;
};

function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return dateKeyInBarberTz(next)!;
}

function jsWeekdayFromKey(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function weekStartKey(weekOffset: number, now = new Date()): string {
  const todayKey = todayKeyInBarberTz(now);
  const jsDay = jsWeekdayFromKey(todayKey);
  const mondayDelta = jsDay === 0 ? -6 : 1 - jsDay;
  return addDaysToKey(todayKey, mondayDelta + weekOffset * 7);
}

export function buildCalendarWeek(weekOffset: number, now = new Date()): CalendarWeekDay[] {
  const start = weekStartKey(weekOffset, now);
  const todayKey = todayKeyInBarberTz(now);

  return WEEKDAY_LABELS.map((weekdayLabel, i) => {
    const key = addDaysToKey(start, i);
    const [y, m, d] = key.split("-").map(Number);
    const labelDate = new Date(Date.UTC(y, m - 1, d, 12));
    const monthShort = labelDate.toLocaleDateString("uz-UZ", {
      timeZone: BARBER_TIME_ZONE,
      month: "short",
    });
    return {
      key,
      weekdayLabel,
      dayNum: d,
      monthShort,
      isToday: key === todayKey,
    };
  });
}

export function formatWeekRangeLabel(days: CalendarWeekDay[]): string {
  if (!days.length) return "";
  const first = days[0];
  const last = days[days.length - 1];
  const [fy, fm] = first.key.split("-").map(Number);
  const [ly, lm] = last.key.split("-").map(Number);
  const firstDate = new Date(Date.UTC(fy, fm - 1, first.dayNum));
  const lastDate = new Date(Date.UTC(ly, lm - 1, last.dayNum));

  const firstMonth = firstDate.toLocaleDateString("uz-UZ", {
    timeZone: BARBER_TIME_ZONE,
    month: "long",
  });
  const lastMonth = lastDate.toLocaleDateString("uz-UZ", {
    timeZone: BARBER_TIME_ZONE,
    month: "long",
  });

  if (firstMonth === lastMonth) {
    return `${first.dayNum} – ${last.dayNum} ${firstMonth}`;
  }
  return `${first.dayNum} ${firstMonth} – ${last.dayNum} ${lastMonth}`;
}

export function bookingDayKey(booking: Booking): string | null {
  return dateKeyInBarberTz(booking.start_at);
}

export function isCalendarBooking(booking: Booking): boolean {
  if (booking.status === "cancelled" || booking.status === "rejected") return false;
  return Boolean(booking.start_at && bookingDayKey(booking));
}

export function bookingMinutesInBarberTz(iso: string): number {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BARBER_TIME_ZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(d);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export function filterBookingsForWeek(
  bookings: Booking[],
  weekDays: CalendarWeekDay[],
): Booking[] {
  const start = weekDays[0]?.key;
  const end = weekDays[weekDays.length - 1]?.key;
  if (!start || !end) return [];

  return bookings.filter((b) => {
    if (!isCalendarBooking(b)) return false;
    const key = bookingDayKey(b);
    return key != null && key >= start && key <= end;
  });
}

export function groupBookingsByDay(
  bookings: Booking[],
  weekDays: CalendarWeekDay[],
): Map<string, Booking[]> {
  const map = new Map<string, Booking[]>();
  for (const day of weekDays) map.set(day.key, []);

  for (const b of bookings) {
    const key = bookingDayKey(b);
    if (!key || !map.has(key)) continue;
    map.get(key)!.push(b);
  }

  for (const [, list] of map) {
    list.sort((a, b) => {
      const ma = a.start_at ? bookingMinutesInBarberTz(a.start_at) : 0;
      const mb = b.start_at ? bookingMinutesInBarberTz(b.start_at) : 0;
      return ma - mb;
    });
  }

  return map;
}

export function bookingBlockStyle(booking: Booking): { top: number; height: number } | null {
  if (!booking.start_at) return null;
  const startMin = bookingMinutesInBarberTz(booking.start_at);
  const gridStart = CALENDAR_START_HOUR * 60;
  const gridEnd = CALENDAR_END_HOUR * 60;
  const endMin = startMin + Math.max(booking.duration_min, 30);

  if (endMin <= gridStart || startMin >= gridEnd) return null;

  const clampedStart = Math.max(startMin, gridStart);
  const clampedEnd = Math.min(endMin, gridEnd);
  const top = ((clampedStart - gridStart) / 60) * CALENDAR_PX_PER_HOUR;
  const height = Math.max(((clampedEnd - clampedStart) / 60) * CALENDAR_PX_PER_HOUR, 28);
  return { top, height };
}
