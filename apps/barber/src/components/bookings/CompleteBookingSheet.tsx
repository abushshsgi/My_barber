import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCircle2, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BookingFlowLoadingOverlay } from "@/components/bookings/BookingFlowLoadingOverlay";
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
  onConfirm: (options: CompleteBookingOptions) => void | Promise<void>;
  onSaveImpressions?: (kinds: ClientImpressionKind[]) => Promise<void> | void;
  impressionsBusy?: boolean;
  onFinished?: () => void;
};

type Phase = "confirm" | "submitting" | "impressions" | "done";

const iconStagger = {
  initial: { opacity: 0, scale: 0.7, y: 16 },
  animate: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  }),
};

function ImpressionIconGrid({
  selected,
  onToggle,
  interactive,
}: {
  selected: ClientImpressionKind[];
  onToggle?: (kind: ClientImpressionKind) => void;
  interactive: boolean;
}) {
  return (
    <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
      {CLIENT_IMPRESSION_OPTIONS.map(({ kind, icon: Icon, label }, index) => {
        const active = selected.includes(kind);
        return (
          <motion.div
            key={kind}
            custom={index}
            variants={iconStagger}
            initial="initial"
            animate="animate"
            className="flex flex-col items-center gap-1.5"
          >
            <button
              type="button"
              disabled={!interactive}
              aria-pressed={active}
              aria-label={label}
              onClick={() => onToggle?.(kind)}
              className={cn(
                "relative flex aspect-square w-full items-center justify-center rounded-2xl border-2 transition-colors",
                interactive && "active:scale-95",
                active
                  ? "border-foreground bg-foreground text-background shadow-md"
                  : interactive
                    ? "border-border bg-card text-foreground hover:border-foreground/30"
                    : "border-border/80 bg-muted/40 text-muted-foreground",
              )}
            >
              <Icon className="size-7 sm:size-8" strokeWidth={1.75} />
              {active ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-emerald-500 text-white shadow-sm"
                >
                  <Check className="size-3" strokeWidth={3} />
                </motion.span>
              ) : null}
            </button>
            <span className="text-center text-[10px] leading-tight text-muted-foreground sm:text-[11px]">
              {label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

export function CompleteBookingSheet({
  open,
  onOpenChange,
  booking,
  busy,
  onConfirm,
  onSaveImpressions,
  impressionsBusy,
  onFinished,
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
    onFinished?.();
    window.setTimeout(() => onOpenChange(false), 1100);
  }, [onFinished, onOpenChange, onSaveImpressions, saved, selected]);

  const handleConfirm = async () => {
    setPhase("submitting");
    try {
      await onConfirm({});
      setPhase("impressions");
    } catch {
      setPhase("confirm");
    }
  };

  return (
    <>
      <BookingFlowLoadingOverlay
        open={open && phase === "submitting"}
        title="Tugatilmoqda…"
        subtitle="Bir oz kuting"
      />

      <AnimatePresence>
        {open && phase !== "submitting" ? (
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
                phase === "impressions" || phase === "done"
                  ? "max-h-[62dvh] max-w-2xl"
                  : "max-h-[min(92dvh,720px)] max-w-lg lg:max-w-xl",
              )}
            >
              <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" />

              {phase === "done" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
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

                  <div className="mt-5">
                    <ImpressionIconGrid
                      selected={selected}
                      onToggle={toggleKind}
                      interactive
                    />
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

                  <p className="mt-4 text-sm text-muted-foreground">
                    Tugatgach mijoz ifodalarini belgilang:
                  </p>

                  <div className="mt-4 rounded-2xl border border-border bg-muted/30 px-3 py-4">
                    <ImpressionIconGrid selected={[]} interactive={false} />
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleConfirm()}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3.5 text-sm font-semibold text-background disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    Tugatishni tasdiqlash
                  </button>
                </div>
              ) : null}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
