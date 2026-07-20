import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Tur", "Yo'l", "Ma'lumot", "Tekshirish"] as const;

type Props = {
  currentStep: number;
  totalSteps?: number;
  /** Mobile header: faqat nuqtalar */
  compact?: boolean;
};

export function AuthStepIndicator({ currentStep, totalSteps = 4, compact = false }: Props) {
  if (compact) {
    return (
      <div className="flex items-center justify-center gap-1.5" aria-label={`Qadam ${currentStep + 1} / ${totalSteps}`}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === currentStep ? "w-6 bg-foreground" : i < currentStep ? "w-2 bg-foreground/50" : "w-2 bg-border",
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => {
        const state = i < currentStep ? "done" : i === currentStep ? "active" : "idle";
        return (
          <div key={STEP_LABELS[i] ?? i} className="flex items-center gap-2">
            {i > 0 && (
              <div className="relative h-[2px] w-6 overflow-hidden rounded-full bg-border sm:w-10">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-foreground"
                  initial={false}
                  animate={{ width: i <= currentStep ? "100%" : "0%" }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>
            )}
            <motion.div
              initial={false}
              animate={{ scale: state === "active" ? 1.03 : 1 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 transition-[var(--transition-smooth)] sm:gap-2 sm:px-2.5 sm:py-1.5",
                state === "active" &&
                  "border-foreground bg-foreground text-background shadow-[var(--shadow-pop)]",
                state === "done" && "border-foreground/40 bg-card text-foreground",
                state === "idle" && "border-border bg-muted/40 text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full sm:h-6 sm:w-6",
                  state === "active" && "bg-background text-foreground",
                  state === "done" && "bg-foreground text-background",
                  state === "idle" && "bg-background text-muted-foreground",
                )}
              >
                {state === "done" ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span className="text-[10px] font-bold tabular-nums sm:text-[11px]">{i + 1}</span>
                )}
              </span>
              <span className="hidden text-[11px] font-semibold tracking-wide sm:inline sm:text-xs">
                {STEP_LABELS[i]}
              </span>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
