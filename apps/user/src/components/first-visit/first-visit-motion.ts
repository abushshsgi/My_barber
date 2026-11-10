import type { Transition, Variants } from "framer-motion";

/** Barcha first-visit slaydlar va gender karusel — bir xil silliq o‘tish. */
export const FIRST_VISIT_EASE = [0.22, 1, 0.36, 1] as const;
export const FIRST_VISIT_SLIDE_MS = 640;

export function firstVisitSlideTransition(reduced: boolean): Transition {
  return reduced
    ? { duration: 0 }
    : { duration: FIRST_VISIT_SLIDE_MS / 1000, ease: FIRST_VISIT_EASE };
}

export function firstVisitSlideVariants(reduced: boolean): Variants {
  return {
    enter: (dir: number) => ({
      x: reduced ? 0 : `${dir * 100}%`,
      opacity: reduced ? 1 : 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      pointerEvents: "auto",
    },
    exit: (dir: number) => ({
      x: reduced ? 0 : `${dir * -20}%`,
      opacity: reduced ? 1 : 0,
      pointerEvents: "none",
    }),
  };
}

export const FIRST_VISIT_SLIDE_MOTION_CLASS =
  "will-change-[transform,opacity] [backface-visibility:hidden]";
