import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCircle2, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Booking } from "@/components/barber/BarberContext";
import type { CompleteBookingOptions } from "@/lib/map-booking";
import {
  CLIENT_IMPRESSION_OPTIONS,
  type ClientImpressionKind,
} from "@/lib/client-impressions";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking;
  busy?: boolean;
  completed?: boolean;
  onConfirm: (options: CompleteBookingOptions) => void;
  onSaveImpressions?: (kinds: ClientImpressionKind[]) => Promise<void> | void;
  impressionsBusy?: boolean;
};

type Phase = "confirm" | "submitting" | "impressions" | "done";

export function CompleteBookingSheet({
  open,
  onOpenChange,
  booking,
  busy,
  completed,
  onConfirm,
  onSaveImpressions,
  impressionsBusy,
}: Props) {
  const [phase, setPhase] = useState<Phase>("confirm");
  const [selected, setSelected] = useState<ClientImpressionKind[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) {
      setPhase("confirm");
      setSelected([]);
      setSaved(false);
    }
  }, [open]);

  useEffect(() => {
    if (completed && open && phase === "submitting") {
      setPhase("impressions");
    }
  }, [completed, open, phase]);

  useEffect(() => {
    if (phase === "submitting" && !busy && !completed) {
      setPhase("confirm");
    }
  }, [phase, busy, completed]);

  const close = () => {
    if (busy || impressionsBusy || phase === "submitting") return;
    onOpenChange(false);
  };

  const toggleKind = (kind: ClientImpressionKind) => {
    setSelected((prev) =>
      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind],
    );
  };

  const finishImpressions = useCallback(async () => {
    if (selected.length && onSaveImpressions && !saved) {
      await onSaveImpressions(selected);
      setSaved(true);
    }
    setPhase("done");
    window.setTimeout(() => onOpenChange(false), 1200);
  }, [onOpenChange, onSaveImpressions, saved, selected]);

  const handleConfirm = () => {
    setPhase("submitting");
    onConfirm({});
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Yopish"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[2px]"
            onClick={close}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 mx-auto w-full overflow-hidden rounded-t-3xl border border-border bg-background shadow-lg",
              phase === "impressions" ? "max-h-[50dvh] max-w-2xl" : "max-h-[min(92dvh,640px)] max-w-lg lg:max-w-xl",
            )}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" />

            {phase === "submitting" ? (
              <div className="flex min-h-[min(50dvh,420px)] flex-col items-center justify-center px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-10">
                <Loader2 className="size-12 animate-spin text-foreground" />
                <p className="mt-5 font-heading text-lg font-semibold">Tugatilmoqda…</p>
                <p className="mt-1 text-sm text-muted-foreground">Bir oz kuting</p>
              </div>
            ) : null}

            {phase === "done" ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-10 text-center"
              >
                <div className="mx-auto grid size-16 place-items-center rounded-full bg-foreground text-background">
                  <CheckCircle2 className="size-8" />
                </div>
                <h2 className="mt-4 font-heading text-xl font-semibold">Xizmat yakunlandi!</h2>
              </motion.div>
            ) : null}

            {phase === "impressions" ? (
              <div className="px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-lg font-semibold">Mijoz haqida</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {booking.client} · tez belgilang (ixtiyoriy)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void finishImpressions()}
                    disabled={impressionsBusy}
                    className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-5 gap-3 sm:gap-4">
                  {CLIENT_IMPRESSION_OPTIONS.map(({ kind, icon: Icon }) => {
                    const active = selected.includes(kind);
                    return (
                      <button
                        key={kind}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleKind(kind)}
                        className={cn(
                          "relative flex aspect-square items-center justify-center rounded-2xl border-2 transition-all active:scale-95",
                          active
                            ? "border-foreground bg-foreground text-background shadow-md"
                            : "border-border bg-card text-foreground hover:border-foreground/30",
                        )}
                      >
                        <Icon className="size-8 sm:size-9" strokeWidth={1.75} />
                        {active ? (
                          <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-emerald-500 text-white shadow-sm">
                            <Check className="size-3.5" strokeWidth={3} />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={impressionsBusy}
                  onClick={() => void finishImpressions()}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3.5 text-sm font-semibold text-background disabled:opacity-60"
                >
                  {impressionsBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                  {selected.length ? "Saqlash va yopish" : "O'tkazib yuborish"}
                </button>
              </div>
            ) : null}

            {phase === "confirm" ? (
              <div className="px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-lg font-semibold">Xizmatni tugatish</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {booking.client} · {booking.service}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    disabled={busy}
                    className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <p className="mt-5 rounded-xl bg-muted/50 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                  Tugatgach mijoz ilovasida baholash so&apos;rovi ochiladi. Keyin mijoz haqida qisqa
                  ifoda belgilashingiz mumkin.
                </p>

                <button
                  type="button"
                  disabled={busy}
                  onClick={handleConfirm}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3.5 text-sm font-semibold text-background disabled:opacity-60"
                >
                  <CheckCircle2 className="size-4" />
                  Tugatishni tasdiqlash
                </button>
              </div>
            ) : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
