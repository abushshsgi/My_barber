import { Link, useLocation } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Booking } from "@/components/barber/BarberContext";
import { useBarberBookingsQuery } from "@/hooks/use-barber-queries";
import { subscribeNewBookingAlert } from "@/hooks/use-booking-live-sync";
import { cn } from "@/lib/utils";

const SEEN_KEY = "barber_seen_pending_bookings";

function readSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeSeen(ids: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
  } catch {
    /* noop */
  }
}

type AlertBooking = Pick<Booking, "id" | "client" | "service" | "time" | "price">;

export function NewBookingAlertBanner() {
  const { pathname } = useLocation();
  const { data: bookings = [] } = useBarberBookingsQuery();
  const [alert, setAlert] = useState<AlertBooking | null>(null);
  const seenRef = useRef(readSeen());
  const knownPendingRef = useRef<Set<string> | null>(null);

  const dismiss = useCallback((id: string) => {
    seenRef.current.add(id);
    writeSeen(seenRef.current);
    setAlert((a) => (a?.id === id ? null : a));
  }, []);

  const showAlert = useCallback(
    (booking: AlertBooking) => {
      if (seenRef.current.has(booking.id)) return;
      if (pathname === `/barber/bookings/${booking.id}`) return;
      setAlert(booking);
    },
    [pathname],
  );

  useEffect(() => {
    const pending = bookings.filter((b) => b.status === "pending");
    if (knownPendingRef.current === null) {
      knownPendingRef.current = new Set(pending.map((b) => b.id));
      return;
    }
    for (const b of pending) {
      if (!knownPendingRef.current.has(b.id) && !seenRef.current.has(b.id)) {
        showAlert(b);
        break;
      }
    }
    knownPendingRef.current = new Set(pending.map((b) => b.id));
  }, [bookings, showAlert]);

  useEffect(() => {
    return subscribeNewBookingAlert((bookingId) => {
      const b = bookings.find((x) => x.id === String(bookingId) && x.status === "pending");
      if (b) showAlert(b);
    });
  }, [bookings, showAlert]);

  useEffect(() => {
    if (!alert) return;
    const id = window.setTimeout(() => dismiss(alert.id), 12_000);
    return () => window.clearTimeout(id);
  }, [alert, dismiss]);

  return (
    <AnimatePresence>
      {alert ? (
        <motion.div
          key={alert.id}
          initial={{ opacity: 0, y: -72 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -72 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="pointer-events-none fixed inset-x-0 top-14 z-50 flex justify-center px-3 sm:px-6"
        >
          <div className="pointer-events-auto flex w-full max-w-lg items-stretch overflow-hidden rounded-2xl border border-foreground/10 bg-foreground text-background shadow-lg sm:max-w-xl">
            <Link
              to="/barber/bookings/$bookingId"
              params={{ bookingId: alert.id }}
              onClick={() => dismiss(alert.id)}
              className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 transition-opacity hover:opacity-95"
            >
              <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-background/15">
                <BellRing className="size-5" />
                <motion.span
                  className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-amber-400"
                  animate={{ scale: [1, 1.35, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-background/70">
                  Yangi zakaz
                </p>
                <p className="truncate font-heading text-sm font-semibold">{alert.client}</p>
                <p className="truncate text-xs text-background/75">
                  {alert.service} · {alert.time}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-background/60" />
            </Link>
            <button
              type="button"
              onClick={() => dismiss(alert.id)}
              className={cn(
                "grid w-11 shrink-0 place-items-center border-l border-background/15",
                "text-background/70 transition-colors hover:bg-background/10 hover:text-background",
              )}
              aria-label="Yopish"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
