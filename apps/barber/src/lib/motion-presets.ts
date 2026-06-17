import { useReducedMotion } from "framer-motion";

export const EASE_SMOOTH = [0.4, 0, 0.2, 1] as const;

export function useMotionDuration(defaultMs: number): number {
  const reduce = useReducedMotion();
  return reduce ? 0 : defaultMs;
}

export const pageEnter = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: EASE_SMOOTH },
};

export function tabSlide(direction: "login" | "signup") {
  return {
    initial: { opacity: 0, x: direction === "login" ? -12 : 12 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: direction === "login" ? 12 : -12 },
    transition: { duration: 0.25, ease: EASE_SMOOTH },
  };
}

export function stepTransition(reduceMotion: boolean) {
  return {
    initial: { opacity: 0, y: reduceMotion ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduceMotion ? 0 : -8 },
    transition: { duration: reduceMotion ? 0 : 0.3, ease: EASE_SMOOTH },
  };
}

export function staggerChild(index: number, reduceMotion: boolean) {
  return {
    initial: { opacity: 0, y: reduceMotion ? 0 : 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : index * 0.05 },
  };
}

export const errorShake = {
  animate: { x: [0, -4, 4, -4, 0] },
  transition: { duration: 0.35 },
};
