import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import { OnboardingSlide } from "@/components/first-visit/OnboardingSlide";
import {
  FIRST_VISIT_SLIDE_MOTION_CLASS,
  firstVisitSlideTransition,
  firstVisitSlideVariants,
} from "@/components/first-visit/first-visit-motion";

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
  const directionRef = useRef(1);
  const [slideDirection, setSlideDirection] = useState(1);

  const forward = () => {
    directionRef.current = 1;
    setSlideDirection(1);
    if (activeMainSlide === 2) onComplete();
    else onContinue();
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      <AnimatePresence initial={false} mode="wait" custom={slideDirection}>
        <motion.div
          key={activeMainSlide}
          data-testid="first-visit-slide"
          data-slide={activeMainSlide}
          className={`absolute inset-0 ${FIRST_VISIT_SLIDE_MOTION_CLASS}`}
          custom={slideDirection}
          variants={firstVisitSlideVariants(reduced)}
          initial={reduced ? false : "enter"}
          animate="center"
          exit="exit"
          transition={firstVisitSlideTransition(reduced)}
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
