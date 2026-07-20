import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onClose: () => void;
};

type Spark = {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  drift: number;
};

const COLORS = ["#F5C542", "#FF6B4A", "#5B8CFF", "#34D399", "#F472B6", "#FBBF24", "#A78BFA"];

function buildSparks(count: number): Spark[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 4 + ((i * 37) % 92),
    delay: (i % 12) * 0.05,
    duration: 1.1 + (i % 5) * 0.18,
    color: COLORS[i % COLORS.length]!,
    size: 4 + (i % 5),
    drift: -40 + ((i * 17) % 80),
  }));
}

export function ReferralClaimCelebration({ open, title, subtitle, ctaLabel, onClose }: Props) {
  const reduceMotion = useReducedMotion();
  const sparks = useMemo(() => buildSparks(reduceMotion ? 12 : 48), [reduceMotion]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(onClose, 5200);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="referral-celebrate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background/90 px-5 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="referral-celebrate-title"
          onClick={onClose}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            {sparks.map((s) => (
              <motion.span
                key={s.id}
                className="absolute bottom-[-8%] rounded-full"
                style={{
                  left: `${s.x}%`,
                  width: s.size,
                  height: s.size,
                  backgroundColor: s.color,
                  boxShadow: `0 0 ${s.size * 2}px ${s.color}`,
                }}
                initial={{ y: 0, opacity: 0, scale: 0.4 }}
                animate={{
                  y: ["0vh", "-72vh", "-88vh"],
                  x: [0, s.drift * 0.4, s.drift],
                  opacity: [0, 1, 0],
                  scale: [0.4, 1.2, 0.2],
                }}
                transition={{
                  duration: s.duration,
                  delay: s.delay,
                  repeat: reduceMotion ? 0 : 2,
                  ease: "easeOut",
                }}
              />
            ))}
            {[0, 1, 2].map((i) => (
              <motion.span
                key={`ring-${i}`}
                className="absolute left-1/2 top-[38%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-400/50"
                initial={{ scale: 0.2, opacity: 0.7 }}
                animate={{ scale: 3.2 + i, opacity: 0 }}
                transition={{ duration: 1.4, delay: 0.15 * i, ease: "easeOut" }}
              />
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 18 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="relative z-10 w-full max-w-sm rounded-3xl border border-border bg-background px-6 py-8 text-center shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.svg
              viewBox="0 0 80 80"
              className="mx-auto mb-4 h-16 w-16"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.08 }}
            >
              <motion.circle
                cx="40"
                cy="40"
                r="36"
                className="text-muted/60"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.55, delay: 0.15 }}
              />
              <motion.path
                d="M26 41 L36 51 L55 30"
                className="text-foreground"
                strokeWidth={3}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.45, delay: 0.5, ease: "easeOut" }}
              />
            </motion.svg>
            <h2 id="referral-celebrate-title" className="text-xl font-bold tracking-tight">
              {title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-foreground py-3 text-sm font-bold text-background"
            >
              {ctaLabel}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
