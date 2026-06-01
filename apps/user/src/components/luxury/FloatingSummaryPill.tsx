import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/mock-data";

interface Props {
  show: boolean;
  count: number;
  totalMinutes: number;
  totalPrice: number;
  className?: string;
}

/**
 * Floating Summary Pill — appears above the bottom CTA when at least
 * one service is selected. Mirrors the "shopping basket" UX pattern.
 */
export function FloatingSummaryPill({
  show,
  count,
  totalMinutes,
  totalPrice,
  className,
}: Props) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={reduce ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          className={cn(
            "pointer-events-none mx-auto flex max-w-[440px] items-center justify-between gap-3",
            "rounded-full bg-onyx px-4 py-3 text-ivory shadow-luxury ring-1 ring-gold/30",
            className,
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gold text-onyx">
              <Sparkles className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <div className="leading-tight">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ivory/70">
                Tanlangan
              </p>
              <p className="text-sm font-bold">
                {count} xizmat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1 text-[11px] font-semibold text-ivory/80 sm:inline-flex">
              <Clock className="h-3.5 w-3.5" strokeWidth={2.4} />
              {totalMinutes} min
            </span>
            <span className="font-display text-lg font-semibold tabular-nums">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
