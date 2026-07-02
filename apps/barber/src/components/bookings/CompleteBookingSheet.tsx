import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Star, Timer, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Booking } from "@/components/barber/BarberContext";
import type { CompleteBookingOptions } from "@/lib/map-booking";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking;
  busy?: boolean;
  completed?: boolean;
  onConfirm: (options: CompleteBookingOptions) => void;
};

export function CompleteBookingSheet({
  open,
  onOpenChange,
  booking,
  busy,
  completed,
  onConfirm,
}: Props) {
  const [earlyFinish, setEarlyFinish] = useState(false);

  useEffect(() => {
    if (!open) setEarlyFinish(false);
  }, [open]);

  useEffect(() => {
    if (completed && open) {
      const id = window.setTimeout(() => onOpenChange(false), 2800);
      return () => window.clearTimeout(id);
    }
  }, [completed, open, onOpenChange]);

  const close = () => {
    if (busy) return;
    onOpenChange(false);
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
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[min(92dvh,640px)] w-full max-w-lg overflow-hidden rounded-t-3xl border border-border bg-background shadow-lg lg:max-w-xl"
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" />

            {completed ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className="mx-auto grid size-16 place-items-center rounded-full bg-foreground text-background"
                >
                  <CheckCircle2 className="size-8" />
                </motion.div>
                <h2 className="mt-4 font-heading text-xl font-semibold">Xizmat yakunlandi!</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Mijoz endi sizni 5 yulduzcha bilan baholashi mumkin.
                </p>
                <div className="mt-4 flex justify-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-6 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </motion.div>
            ) : (
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

                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 hover:bg-muted/40">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={earlyFinish}
                    onChange={(e) => setEarlyFinish(e.target.checked)}
                  />
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Timer className="size-4" />
                      Erta tugatish
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Rejadan oldin tugatilsa, haqiqiy vaqt qayd etiladi.
                    </p>
                  </div>
                </label>

                <div className="mt-4 rounded-xl bg-muted/50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    Mijoz baholaydi
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Tugatgach mijoz ilovasida 5 yulduzcha va sharh so&apos;rovi avtomatik ochiladi.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onConfirm({ early_finish: earlyFinish })}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3.5 text-sm font-semibold text-background disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  Tugatishni tasdiqlash
                </button>
              </div>
            )}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
