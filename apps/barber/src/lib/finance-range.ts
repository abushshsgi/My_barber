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

export function statsRangeToIsoParams(key: StatsRangeKey, now = new Date()): { start: string; end: string } {
  const end = todayKeyInBarberTz(now);
  if (!end) return { start: end, end };
  const [y, m, d] = end.split("-").map(Number);
  const cursor = new Date(Date.UTC(y, m - 1, d));
  const daysBack = key === "7d" ? 6 : key === "30d" ? 29 : 89;
  cursor.setUTCDate(cursor.getUTCDate() - daysBack);
  const start = dateKeyInBarberTz(cursor) ?? formatLocalDate(parseLocalDateYmd(end));
  return { start, end };
}

export function isDateInStatsRange(isoDate: string, key: StatsRangeKey, now = new Date()): boolean {
  const dateKey = dateKeyInBarberTz(isoDate);
  if (!dateKey) return false;
  const { start, end } = statsRangeToIsoParams(key, now);
  return dateKey >= start && dateKey <= end;
}

export function filterCompletedBookingsByStatsRange(
  bookings: Booking[],
  range: StatsRangeKey,
  now = new Date(),
): Booking[] {
  return bookings.filter((b) => {
    if (b.status !== "completed") return false;
    const at = bookingEarningsAt(b);
    return Boolean(at) && isDateInStatsRange(at!, range, now);
  });
}

export type StatsDailyRow = {
  date: string;
  revenue: number;
  cash: number;
  online: number;
  bookings: number;
  clients: number;
};

export type ApiDailyRow = {
  date: string;
  revenue: string | number;
  cash_revenue?: string | number;
  online_revenue?: string | number;
  bookings?: number;
  clients?: number;
};

function mergeDayMetric(apiVal: number | undefined, localVal: number): number {
  if (apiVal != null && apiVal > 0) return apiVal;
  if (localVal > 0) return localVal;
  return apiVal ?? localVal ?? 0;
}

export function buildStatsDailyRows(
  apiDaily: ApiDailyRow[] = [],
  completedBookings: Booking[] = [],
  range: StatsRangeKey,
  now = new Date(),
): StatsDailyRow[] {
  const fromBookings = new Map<
    string,
    { revenue: number; cash: number; online: number; bookings: number; clients: Set<number> }
  >();

  for (const b of completedBookings) {
    const at = bookingEarningsAt(b);
    if (!at || !isDateInStatsRange(at, range, now)) continue;
    const key = dateKeyInBarberTz(at) ?? localDateKey(new Date(at));
    const row = fromBookings.get(key) ?? {
      revenue: 0,
      cash: 0,
      online: 0,
      bookings: 0,
      clients: new Set<number>(),
    };
    row.revenue += b.price;
    if (b.payment_method === "cash") row.cash += b.price;
    if (b.payment_method === "online") row.online += b.price;
    row.bookings += 1;
    if (b.customer_id) row.clients.add(b.customer_id);
    fromBookings.set(key, row);
  }

  const apiByDate = new Map<string, ApiDailyRow>();
  for (const row of apiDaily) {
    const key = row.date.slice(0, 10);
    apiByDate.set(key, row);
  }

  const { start, end } = statsRangeToIsoParams(range, now);
  const startDt = parseLocalDateYmd(start);
  const endDt = parseLocalDateYmd(end);
  const out: StatsDailyRow[] = [];
  const cursor = new Date(startDt);

  while (cursor <= endDt) {
    const key = formatLocalDate(cursor);
    const api = apiByDate.get(key);
    const local = fromBookings.get(key);
    const localClients = local?.clients.size ?? 0;

    out.push({
      date: key,
      revenue: mergeDayMetric(api ? Number(api.revenue) : undefined, local?.revenue ?? 0),
      cash: mergeDayMetric(
        api?.cash_revenue != null ? Number(api.cash_revenue) : undefined,
        local?.cash ?? 0,
      ),
      online: mergeDayMetric(
        api?.online_revenue != null ? Number(api.online_revenue) : undefined,
        local?.online ?? 0,
      ),
      bookings: mergeDayMetric(api?.bookings, local?.bookings ?? 0),
      clients: mergeDayMetric(api?.clients, localClients),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return out;
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
  bookings: number;
  heightPct: number;
};

function formatChartDayLabel(date: string, dense: boolean): string {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return date.slice(5);
  if (dense) {
    return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" });
  }
  return d.toLocaleDateString("uz-UZ", { weekday: "short", day: "2-digit" });
}

export function buildDailyBarChart(
  rows: Array<{ date: string; revenue: string | number; bookings?: number }>,
): { items: DailyChartItem[]; hasData: boolean; tickInterval: number } {
  const dense = rows.length > 14;
  const items = rows.map((row) => {
    const date = row.date.slice(0, 10);
    const amount = Number(row.revenue) || 0;
    const bookings = Number(row.bookings) || 0;
    return {
      date,
      label: formatChartDayLabel(date, dense),
      amount,
      bookings,
      heightPct: 0,
    };
  });
  const max = Math.max(1, ...items.map((i) => i.amount));
  const withHeights = items.map((i) => ({
    ...i,
    heightPct: i.amount > 0 ? Math.round((i.amount / max) * 100) : 0,
  }));
  const tickInterval = dense ? Math.max(1, Math.floor(withHeights.length / 7)) : 0;
  return {
    items: withHeights,
    hasData: withHeights.some((i) => i.amount > 0),
    tickInterval,
  };
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
  const apiByDate = new Map(daily.map((row) => [row.date.slice(0, 10), Number(row.revenue) || 0]));
  const apiHasData = [...apiByDate.values()].some((v) => v > 0);
  const useBookings = !apiHasData && fromBookings.size > 0;

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
