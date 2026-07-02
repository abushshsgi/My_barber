import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
};

/** Bron jarayoni loading — xira fon, markazda spinner. */
export function BookingFlowLoadingOverlay({ open, title, subtitle }: Props) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-foreground/45 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none fixed inset-x-0 top-[18vh] z-[70] flex justify-center px-6"
          >
            <div className="flex min-w-[min(100%,18rem)] flex-col items-center rounded-2xl border border-border bg-background px-8 py-7 text-center shadow-lg">
              <Loader2 className="size-10 animate-spin text-foreground" />
              <p className="mt-4 font-heading text-lg font-semibold text-foreground">{title}</p>
              {subtitle ? (
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
