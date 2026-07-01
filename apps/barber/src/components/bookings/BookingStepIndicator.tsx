import { motion } from "framer-motion";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type BookingStepMeta = {
  id: string;
  short: string;
  icon: LucideIcon;
};

export function BookingStepIndicator({
  steps,
  step,
}: {
  steps: readonly BookingStepMeta[];
  step: number;
}) {
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted sm:h-1.5">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-foreground"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider tabular-nums text-muted-foreground">
          {step + 1}/{steps.length}
        </span>
      </div>

      <div className="flex items-center justify-center gap-1 sm:gap-2">
        {steps.map((meta, i) => {
          const Icon = meta.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={meta.id} className="flex items-center gap-1 sm:gap-2">
              {i > 0 ? (
                <div className="hidden h-px w-3 bg-border sm:block sm:w-5" aria-hidden />
              ) : null}
              <motion.div
                initial={false}
                animate={{ scale: active ? 1.03 : 1 }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-[11px]",
                  done && "border-foreground bg-foreground text-background",
                  active && !done && "border-foreground bg-background text-foreground shadow-card",
                  !done && !active && "border-border bg-muted/30 text-muted-foreground",
                )}
              >
                <span className="grid size-4 place-items-center sm:size-5">
                  {done ? (
                    <Check className="size-3 sm:size-3.5" />
                  ) : (
                    <Icon className="size-3 sm:size-3.5" />
                  )}
                </span>
                <span className="hidden sm:inline">{meta.short}</span>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const bookingFlowSlide = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};
