import { motion, useReducedMotion } from "framer-motion";
import type { MainSlideIndex } from "@/lib/first-visit-onboarding";

const STEP_LABELS = ["1-qadam", "2-qadam", "3-qadam"] as const;

type Props = {
  active: MainSlideIndex;
};

export function OnboardingProgress({ active }: Props) {
  const reduced = useReducedMotion();

  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <p className="sr-only">{`3 tadan ${active + 1}-qadam`}</p>
      <div className="flex items-center justify-center gap-2" aria-hidden>
        {STEP_LABELS.map((label, index) => {
          const selected = index === active;
          return (
            <motion.span
              key={label}
              className="block h-2 rounded-full bg-[#6d28d9]"
              animate={{ width: selected ? 22 : 8, opacity: selected ? 1 : 0.32 }}
              transition={{ duration: reduced ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            />
          );
        })}
      </div>
    </div>
  );
}
