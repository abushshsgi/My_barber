export type ApiWorkingHour = {
  id: number;
  membership?: number;
  weekday: number;
  open_time: string;
  close_time: string;
  is_day_off: boolean;
  breaks?: BreakItem[];
};

export type DayForm = {
  id?: number;
  weekday: number;
  open_time: string;
  close_time: string;
  is_day_off: boolean;
  breaksText: string;
};

export type BreakItem = { start: string; end: string };

export type ScheduleMembership = {
  id: number;
  barber: number | null;
  salon: number;
  role: string;
  invite_state: string;
};

export type BookingMode = "daily" | "advance";

export type BookingSettings = {
  booking_mode: BookingMode;
  advance_min_days: number;
  advance_max_days: number;
};

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  booking_mode: "daily",
  advance_min_days: 2,
  advance_max_days: 3,
};

export const WEEKDAYS = [
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
  "Yakshanba",
] as const;

export const WEEKDAY_SHORT = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"] as const;

export const defaultDays = (): DayForm[] =>
  WEEKDAYS.map((_, weekday) => ({
    weekday,
    open_time: "09:00",
    close_time: "22:00",
    is_day_off: weekday === 6,
    breaksText: weekday === 6 ? "" : "12:00-13:00",
  }));

export function applyHours(rows: ApiWorkingHour[]): DayForm[] {
  const byWeekday = new Map(rows.map((row) => [row.weekday, row]));
  return defaultDays().map((day) => {
    const row = byWeekday.get(day.weekday);
    if (!row) return day;
    return {
      id: row.id,
      weekday: row.weekday,
      open_time: String(row.open_time).slice(0, 5),
      close_time: String(row.close_time).slice(0, 5),
      is_day_off: Boolean(row.is_day_off),
      breaksText: (row.breaks || []).map((br) => `${br.start}-${br.end}`).join(", "),
    };
  });
}

export function parseBreaks(input: string): BreakItem[] {
  return input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [start, end] = part.split("-").map((v) => v.trim());
      if (!/^\d{2}:\d{2}$/.test(start || "") || !/^\d{2}:\d{2}$/.test(end || "")) {
        throw new Error("Tanaffus HH:MM-HH:MM formatida bo'lishi kerak.");
      }
      if (start >= end) {
        throw new Error("Tanaffus boshlanishi tugashidan oldin bo'lishi kerak.");
      }
      return { start, end };
    });
}

export function serializeScheduleDays(days: DayForm[]): string {
  return JSON.stringify(
    days.map((d) => ({
      id: d.id,
      weekday: d.weekday,
      open_time: d.open_time,
      close_time: d.close_time,
      is_day_off: d.is_day_off,
      breaksText: d.breaksText,
    })),
  );
}

export function countWorkingDays(days: DayForm[]): number {
  return days.filter((d) => !d.is_day_off).length;
}
