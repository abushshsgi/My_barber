import { useNavigate, useLocation } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, CheckCircle2, Clock, Scissors, X } from "lucide-react";
import { playNewBookingAlertSound } from "@mybarber/shared/booking-lifecycle";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Booking } from "@/components/barber/BarberContext";
import { formatUZS } from "@/components/barber/BarberContext";
import { useBarberBookingsQuery } from "@/hooks/use-barber-queries";
import { subscribeNewBookingAlert } from "@/hooks/use-booking-live-sync";
import { cn } from "@/lib/utils";

const SEEN_KEY = "barber_seen_pending_bookings";
const ALERT_SOUND_MS = 8_000;

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

type AlertBooking = Pick<Booking, "id" | "client" | "service" | "time" | "price" | "duration_min">;

export function NewBookingAlertBanner() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: bookings = [] } = useBarberBookingsQuery();
  const [alert, setAlert] = useState<AlertBooking | null>(null);
  const seenRef = useRef(readSeen());
  const knownPendingRef = useRef<Set<string> | null>(null);
  const stopSoundRef = useRef<(() => void) | null>(null);

  const stopSound = useCallback(() => {
    stopSoundRef.current?.();
    stopSoundRef.current = null;
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      stopSound();
      seenRef.current.add(id);
      writeSeen(seenRef.current);
      setAlert((a) => (a?.id === id ? null : a));
    },
    [stopSound],
  );

  const showAlert = useCallback(
    (booking: AlertBooking) => {
      if (seenRef.current.has(booking.id)) return;
      if (pathname === `/barber/bookings/${booking.id}`) return;
      setAlert(booking);
    },
    [pathname],
  );

  const acceptAndGo = useCallback(
    (booking: AlertBooking) => {
      stopSound();
      seenRef.current.add(booking.id);
      writeSeen(seenRef.current);
      setAlert(null);
      void navigate({ to: "/barber/bookings/$bookingId", params: { bookingId: booking.id } });
    },
    [navigate, stopSound],
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
    if (!alert) {
      stopSound();
      return;
    }

    stopSoundRef.current = playNewBookingAlertSound(ALERT_SOUND_MS);

    const autoDismiss = window.setTimeout(() => dismiss(alert.id), ALERT_SOUND_MS + 4_000);
    return () => {
      window.clearTimeout(autoDismiss);
      stopSound();
    };
  }, [alert, dismiss, stopSound]);

  return (
    <AnimatePresence>
      {alert ? (
        <>
          <motion.button
            key={`${alert.id}-backdrop`}
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-black/25 backdrop-blur-[2px]"
            aria-label="Bildirishnomani yopish"
            onClick={() => dismiss(alert.id)}
          />
          <motion.aside
            key={alert.id}
            initial={{ opacity: 0, x: 420 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 420 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className={cn(
              "fixed right-0 top-1/2 z-[70] flex w-[400px] max-w-[calc(100vw-1rem)]",
              "h-[700px] max-h-[calc(100vh-2rem)] -translate-y-1/2 flex-col overflow-hidden",
              "rounded-l-3xl border border-foreground/10 bg-card shadow-2xl",
            )}
            role="alertdialog"
            aria-labelledby="new-booking-alert-title"
            aria-describedby="new-booking-alert-desc"
          >
            <div className="relative flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="relative grid size-11 place-items-center rounded-2xl bg-amber-400/15 text-amber-600">
                  <BellRing className="size-5" />
                  <motion.span
                    className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-amber-400"
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1.1, repeat: Infinity }}
                  />
                </span>
                <div>
                  <p
                    id="new-booking-alert-title"
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Yangi buyurtma
                  </p>
                  <p className="font-heading text-base font-semibold text-foreground">Javob bering</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismiss(alert.id)}
                className="grid size-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Yopish"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-5 py-6">
              <div className="rounded-2xl bg-foreground px-5 py-6 text-background">
                <p className="text-xs font-medium uppercase tracking-wide text-background/65">Buyurtma narxi</p>
                <p className="mt-1 font-heading text-4xl font-bold tabular-nums tracking-tight">
                  {formatUZS(alert.price)}
                </p>
              </div>

              <div id="new-booking-alert-desc" className="mt-6 space-y-4">
                <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3.5">
                  <p className="text-xs font-medium text-muted-foreground">Mijoz</p>
                  <p className="mt-0.5 truncate font-heading text-lg font-semibold text-foreground">
                    {alert.client}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3.5">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Scissors className="size-3.5" />
                      Xizmat
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">{alert.service}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3.5">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Clock className="size-3.5" />
                      Vaqt
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">{alert.time}</p>
                    {alert.duration_min > 0 ? (
                      <p className="text-xs text-muted-foreground">{alert.duration_min} daqiqa</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-auto space-y-3 pt-6">
                <button
                  type="button"
                  onClick={() => acceptAndGo(alert)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-4 py-4 text-base font-semibold text-background transition-opacity hover:opacity-90 active:opacity-80"
                >
                  <CheckCircle2 className="size-5" />
                  Qabul qilish
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(alert.id)}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
                >
                  Keyinroq
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
