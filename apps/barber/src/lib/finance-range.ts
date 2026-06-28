import type { Booking, Transaction } from "@/components/barber/BarberContext";

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
  return formatLocalDate(startOfLocalDay(d));
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

export function isDateInRange(isoDate: string, range: EarningsRange, now = new Date()): boolean {
  const dt = startOfLocalDay(new Date(isoDate));
  if (Number.isNaN(dt.getTime())) return false;
  const from = rangeStart(range, now);
  const to = startOfLocalDay(now);
  return dt >= from && dt <= to;
}

export function isCurrentMonth(isoDate?: string, now = new Date()): boolean {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function filterCompletedBookingsByRange(
  bookings: Booking[],
  range: EarningsRange,
): Booking[] {
  return bookings.filter(
    (b) =>
      b.status === "completed" &&
      Boolean(b.start_at) &&
      isDateInRange(b.start_at!, range),
  );
}

export function filterTransactionsByRange(
  transactions: Transaction[],
  range: EarningsRange,
): Transaction[] {
  return transactions.filter((t) => isDateInRange(t.date, range));
}

export function rangeToIsoParams(range: EarningsRange, now = new Date()): { start: string; end: string } {
  const from = rangeStart(range, now);
  const to = startOfLocalDay(now);
  return {
    start: formatLocalDate(from),
    end: formatLocalDate(to),
  };
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
  const end = startOfLocalDay(new Date());
  const start = new Date(end);
  start.setDate(start.getDate() - 6);

  const fromBookings = new Map<string, number>();
  for (const b of completedBookings) {
    if (b.status !== "completed" || !b.start_at) continue;
    if (!isDateInRange(b.start_at, "Hafta")) continue;
    const key = localDateKey(new Date(b.start_at));
    fromBookings.set(key, (fromBookings.get(key) ?? 0) + b.price);
  }

  const useBookings = fromBookings.size > 0;
  const labels: string[] = [];
  const amounts: number[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = localDateKey(d);
    labels.push(d.toLocaleDateString("uz-UZ", { weekday: "short" }));
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
