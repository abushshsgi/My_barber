import type { Booking, Transaction } from "@/components/barber/BarberContext";
import {
  dateKeyInBarberTz,
  isSameBarberDay,
  todayKeyInBarberTz,
  tomorrowKeyInBarberTz,
} from "@/lib/barber-timezone";

export const EARNINGS_RANGES = ["Bugun", "Hafta", "Oy", "Yil"] as const;
export type EarningsRange = (typeof EARNINGS_RANGES)[number];

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function localDateKey(d: Date): string {
  return dateKeyInBarberTz(d) ?? formatLocalDate(startOfLocalDay(d));
}

export function bookingEarningsAt(booking: Booking): string | undefined {
  return booking.completed_at ?? booking.start_at;
}

export function isBookingOnLocalDay(isoDate: string | undefined, day = new Date()): boolean {
  return isSameBarberDay(isoDate, day);
}

export function isBookingScheduledToday(booking: Booking, day = new Date()): boolean {
  if (booking.status === "cancelled" || booking.status === "rejected") return false;
  if (isSameBarberDay(booking.start_at, day)) return true;
  if (booking.status === "completed") {
    return isSameBarberDay(bookingEarningsAt(booking), day);
  }
  return false;
}

export function bookingDateLabel(isoDate: string, now = new Date()): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";
  const key = dateKeyInBarberTz(isoDate);
  const todayKey = todayKeyInBarberTz(now);
  const tomorrowKey = tomorrowKeyInBarberTz(now);
  if (key === todayKey) return "Today";
  if (key === tomorrowKey) return "Tomorrow";
  return d.toLocaleDateString("uz-UZ", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "short",
  });
}

export function rangeStart(range: EarningsRange, now = new Date()): Date {
  const end = startOfLocalDay(now);
  const start = new Date(end);
  switch (range) {
    case "Bugun":
      return start;
    case "Hafta":
      start.setDate(start.getDate() - 6);
      return start;
    case "Oy":
      return new Date(end.getFullYear(), end.getMonth(), 1);
    case "Yil":
      return new Date(end.getFullYear(), 0, 1);
    default:
      return start;
  }
}

export function rangeKeysInBarberTz(
  range: EarningsRange,
  now = new Date(),
): { start: string; end: string } {
  const end = todayKeyInBarberTz(now);
  const [y, m, d] = end.split("-").map(Number);
  const cursor = new Date(Date.UTC(y, m - 1, d));
  if (range === "Bugun") return { start: end, end };
  if (range === "Hafta") {
    cursor.setUTCDate(cursor.getUTCDate() - 6);
    return { start: dateKeyInBarberTz(cursor)!, end };
  }
  if (range === "Oy") return { start: `${end.slice(0, 7)}-01`, end };
  if (range === "Yil") return { start: `${end.slice(0, 4)}-01-01`, end };
  return { start: end, end };
}

export function isDateInRange(isoDate: string, range: EarningsRange, now = new Date()): boolean {
  const key = dateKeyInBarberTz(isoDate);
  if (!key) return false;
  const { start, end } = rangeKeysInBarberTz(range, now);
  return key >= start && key <= end;
}

export function isCurrentMonth(isoDate?: string, now = new Date()): boolean {
  if (!isoDate) return false;
  const key = dateKeyInBarberTz(isoDate);
  if (!key) return false;
  const monthPrefix = todayKeyInBarberTz(now).slice(0, 7);
  return key.startsWith(monthPrefix);
}

export function filterCompletedBookingsByRange(
  bookings: Booking[],
  range: EarningsRange,
): Booking[] {
  return bookings.filter(
    (b) =>
      b.status === "completed" &&
      Boolean(bookingEarningsAt(b)) &&
      isDateInRange(bookingEarningsAt(b)!, range),
  );
}

export function filterTransactionsByRange(
  transactions: Transaction[],
  range: EarningsRange,
): Transaction[] {
  return transactions.filter((t) => isDateInRange(t.date, range));
}

export function rangeToIsoParams(range: EarningsRange, now = new Date()): { start: string; end: string } {
  return rangeKeysInBarberTz(range, now);
}

export function last7DaysIsoParams(now = new Date()): { start: string; end: string } {
  return rangeToIsoParams("Hafta", now);
}

export type StatsRangeKey = "7d" | "30d" | "90d";

function parseLocalDateYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function isDateInStatsRange(isoDate: string, key: StatsRangeKey, now = new Date()): boolean {
  const dt = startOfLocalDay(new Date(isoDate));
  if (Number.isNaN(dt.getTime())) return false;
  const { start, end } = statsRangeToIsoParams(key, now);
  const from = parseLocalDateYmd(start);
  const to = parseLocalDateYmd(end);
  return dt >= from && dt <= to;
}

export function statsRangeToIsoParams(key: StatsRangeKey, now = new Date()): { start: string; end: string } {
  const end = startOfLocalDay(now);
  const start = startOfLocalDay(now);
  if (key === "7d") start.setDate(start.getDate() - 6);
  else if (key === "30d") start.setDate(start.getDate() - 29);
  else start.setDate(start.getDate() - 89);
  return {
    start: formatLocalDate(start),
    end: formatLocalDate(end),
  };
}

export function formatFinanceDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export type DailyChartItem = {
  date: string;
  label: string;
  amount: number;
  heightPct: number;
};

export function buildDailyBarChart(
  rows: Array<{ date: string; revenue: string | number }>,
): { items: DailyChartItem[]; hasData: boolean } {
  const items = rows.map((row) => {
    const date = row.date.slice(0, 10);
    const amount = Number(row.revenue) || 0;
    return { date, label: date.slice(5), amount, heightPct: 0 };
  });
  const max = Math.max(1, ...items.map((i) => i.amount));
  const withHeights = items.map((i) => ({
    ...i,
    heightPct: i.amount > 0 ? Math.round((i.amount / max) * 100) : 0,
  }));
  return {
    items: withHeights,
    hasData: withHeights.some((i) => i.amount > 0),
  };
}

export function buildStatsDailyRows(
  apiDaily: Array<{ date: string; revenue: string | number }> = [],
  completedBookings: Booking[] = [],
  range: StatsRangeKey,
): Array<{ date: string; revenue: string }> {
  const fromBookings = new Map<string, number>();
  for (const b of completedBookings) {
    if (b.status !== "completed" || !bookingEarningsAt(b)) continue;
    if (!isDateInStatsRange(bookingEarningsAt(b)!, range)) continue;
    const key = dateKeyInBarberTz(bookingEarningsAt(b)!);
    if (!key) continue;
    fromBookings.set(key, (fromBookings.get(key) ?? 0) + b.price);
  }

  const apiHasData = apiDaily.some((d) => Number(d.revenue) > 0);
  const source = apiHasData
    ? apiDaily
    : [...fromBookings.entries()].map(([date, revenue]) => ({ date, revenue: String(revenue) }));

  const { start, end } = statsRangeToIsoParams(range);
  const startDt = parseLocalDateYmd(start);
  const endDt = parseLocalDateYmd(end);
  const byDate = new Map<string, number>();
  for (const row of source) {
    const key = row.date.slice(0, 10);
    byDate.set(key, (byDate.get(key) ?? 0) + (Number(row.revenue) || 0));
  }

  const out: Array<{ date: string; revenue: string }> = [];
  const cursor = new Date(startDt);
  while (cursor <= endDt) {
    const key = formatLocalDate(cursor);
    out.push({ date: key, revenue: String(byDate.get(key) ?? 0) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function buildLast7DaysChart(
  daily: Array<{ date: string; revenue: string | number }> = [],
  completedBookings: Booking[] = [],
): {
  bars: number[];
  labels: string[];
  amounts: number[];
  weekSegmentTotal: number;
  hasData: boolean;
} {
  const fromBookings = new Map<string, number>();
  for (const b of completedBookings) {
    if (b.status !== "completed" || !bookingEarningsAt(b)) continue;
    if (!isDateInRange(bookingEarningsAt(b)!, "Hafta")) continue;
    const key = dateKeyInBarberTz(bookingEarningsAt(b)!);
    if (!key) continue;
    fromBookings.set(key, (fromBookings.get(key) ?? 0) + b.price);
  }
  const useBookings = fromBookings.size > 0;

  const { start: weekStartKey } = rangeKeysInBarberTz("Hafta");
  const [sy, sm, sd] = weekStartKey.split("-").map(Number);
  const labels: string[] = [];
  const amounts: number[] = [];

  for (let i = 0; i < 7; i++) {
    const cursor = new Date(Date.UTC(sy, sm - 1, sd + i));
    const key = dateKeyInBarberTz(cursor)!;
    labels.push(
      cursor.toLocaleDateString("uz-UZ", {
        timeZone: "Asia/Tashkent",
        weekday: "short",
      }),
    );
    if (useBookings) {
      amounts.push(fromBookings.get(key) ?? 0);
    } else {
      const row = daily.find((x) => x.date.slice(0, 10) === key);
      amounts.push(row ? Number(row.revenue) : 0);
    }
  }

  const max = Math.max(1, ...amounts);
  const bars = amounts.map((a) => (a > 0 ? Math.round((a / max) * 100) : 0));
  const weekSegmentTotal = amounts.reduce((s, x) => s + x, 0);
  return { bars, labels, amounts, weekSegmentTotal, hasData: weekSegmentTotal > 0 };
}
