import type { Booking } from "@/components/barber/BarberContext";

const BOOKINGS_KEY = "barber:snapshot:bookings:v1";
const BOOKINGS_AT_KEY = "barber:snapshot:bookings:at:v1";
const TTL_MS = 10 * 60_000;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function readBookingsSnapshot(): Booking[] | null {
  if (!canUseStorage()) return null;
  try {
    const at = Number(sessionStorage.getItem(BOOKINGS_AT_KEY) || "0");
    if (!at || Date.now() - at > TTL_MS) return null;
    const raw = sessionStorage.getItem(BOOKINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Booking[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeBookingsSnapshot(bookings: Booking[]): void {
  if (!canUseStorage()) return;
  try {
    sessionStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    sessionStorage.setItem(BOOKINGS_AT_KEY, String(Date.now()));
  } catch {
    /* quota */
  }
}

export function readBookingsSnapshotUpdatedAt(): number | undefined {
  if (!canUseStorage()) return undefined;
  const at = Number(sessionStorage.getItem(BOOKINGS_AT_KEY) || "0");
  return at > 0 ? at : undefined;
}
