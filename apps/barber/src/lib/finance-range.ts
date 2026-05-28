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

export function formatFinanceDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
