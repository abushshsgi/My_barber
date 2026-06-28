/** Barber panel — O'zbekiston vaqti (bronlar va daromad sanalari). */
export const BARBER_TIME_ZONE = "Asia/Tashkent";

export function dateKeyInBarberTz(iso: string | Date | undefined, now?: Date): string | null {
  if (!iso) return null;
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: BARBER_TIME_ZONE }).format(d);
}

export function todayKeyInBarberTz(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BARBER_TIME_ZONE }).format(now);
}

export function isSameBarberDay(
  iso: string | undefined,
  ref: string | Date = new Date(),
): boolean {
  const key = dateKeyInBarberTz(iso);
  if (!key) return false;
  const refKey = ref instanceof Date ? todayKeyInBarberTz(ref) : dateKeyInBarberTz(ref);
  return refKey != null && key === refKey;
}

export function tomorrowKeyInBarberTz(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BARBER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  const utc = Date.UTC(y, m - 1, d + 1);
  return new Intl.DateTimeFormat("en-CA", { timeZone: BARBER_TIME_ZONE }).format(new Date(utc));
}
