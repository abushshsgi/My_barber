import type { Booking, Transaction } from "@/components/barber/BarberContext";

export const EARNINGS_RANGES = ["Bugun", "Hafta", "Oy", "Yil"] as const;
export type EarningsRange = (typeof EARNINGS_RANGES)[number];

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
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
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  return {
    start: from.toISOString(),
    end: to.toISOString(),
  };
}

export function last7DaysIsoParams(now = new Date()): { start: string; end: string } {
  return rangeToIsoParams("Hafta", now);
}

export type StatsRangeKey = "7d" | "30d" | "90d";

export function statsRangeToIsoParams(key: StatsRangeKey, now = new Date()): { start: string; end: string } {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = startOfLocalDay(now);
  if (key === "7d") start.setDate(start.getDate() - 6);
  else if (key === "30d") start.setDate(start.getDate() - 29);
  else start.setDate(start.getDate() - 89);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
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
