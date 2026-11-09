import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { OnboardingSlide } from "@/components/first-visit/OnboardingSlide";

const EASE = [0.22, 1, 0.36, 1] as const;
const SLIDE_SECONDS = 0.68;

type Props = {
  activeMainSlide: 0 | 1 | 2;
  onContinue: () => void;
  onComplete: () => void;
  onSkip: () => void;
};

export function OnboardingCarousel({
  activeMainSlide,
  onContinue,
  onComplete,
  onSkip,
}: Props) {
  const reduced = useReducedMotion();
  const direction = useRef(1);

  const forward = () => {
    direction.current = 1;
    if (activeMainSlide === 2) onComplete();
    else onContinue();
  };

  return (
    <div className="absolute inset-0">
      <AnimatePresence initial={false} custom={direction.current}>
        <motion.div
          key={activeMainSlide}
          data-testid="first-visit-slide"
          data-slide={activeMainSlide}
          className="absolute inset-0"
          custom={direction.current}
          variants={{
            enter: (dir: number) => ({
              opacity: 0,
              x: dir * (reduced ? 0 : 56),
              scale: reduced ? 1 : 0.97,
            }),
            center: { opacity: 1, x: 0, scale: 1, pointerEvents: "auto" },
            exit: (dir: number) => ({
              opacity: 0,
              x: dir * (reduced ? 0 : -36),
              scale: reduced ? 1 : 0.98,
              pointerEvents: "none",
            }),
          }}
          initial={reduced ? false : "enter"}
          animate="center"
          exit="exit"
          transition={{ duration: reduced ? 0 : SLIDE_SECONDS, ease: EASE }}
        >
          <OnboardingSlide
            index={activeMainSlide}
            onContinue={forward}
            onComplete={onComplete}
            onSkip={onSkip}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
