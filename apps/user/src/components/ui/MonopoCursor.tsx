import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const INTERACTIVE =
  'a, button, [role="button"], input, textarea, select, label, summary, [data-cursor="hover"]';

type Props = {
  /** Outer ring spring stiffness (default 120). */
  stiffness?: number;
  /** Outer ring spring damping (default 20). */
  damping?: number;
  /** Scale when hovering interactive elements (default 1.5). */
  hoverScale?: number;
};

/**
 * monopo.vn-style magnetic cursor — Framer Motion springs.
 * Ring lags with spring physics; center dot tracks instantly.
 */
export function MonopoCursor({
  stiffness = 120,
  damping = 20,
  hoverScale = 1.5,
}: Props) {
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const hover = useMotionValue(0);

  const springCfg = { stiffness, damping, mass: 0.4 };
  const ringX = useSpring(mouseX, springCfg);
  const ringY = useSpring(mouseY, springCfg);
  const ringScale = useSpring(
    useTransform(hover, [0, 1], [1, hoverScale]),
    { stiffness: 280, damping: 22 },
  );
  const ringOpacity = useSpring(
    useTransform(hover, [0, 1], [0.85, 1]),
    { stiffness: 280, damping: 22 },
  );

  useEffect(() => {
    setMounted(true);
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    setEnabled(true);
    document.documentElement.classList.add("monopo-cursor-active");

    const onMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    const onOver = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest(INTERACTIVE)) hover.set(1);
    };

    const onOut = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (!t.closest(INTERACTIVE)) return;
      const related = e.relatedTarget;
      if (related instanceof Element && related.closest(INTERACTIVE)) return;
      hover.set(0);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", onOut, true);

    return () => {
      document.documentElement.classList.remove("monopo-cursor-active");
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mouseout", onOut, true);
    };
  }, [hover, mouseX, mouseY]);

  if (!mounted || !enabled) return null;

  return createPortal(
    <>
      <style>{`
        html.monopo-cursor-active,
        html.monopo-cursor-active body,
        html.monopo-cursor-active body * {
          cursor: none !important;
        }
        @media (pointer: coarse), (prefers-reduced-motion: reduce) {
          html.monopo-cursor-active,
          html.monopo-cursor-active body,
          html.monopo-cursor-active body * {
            cursor: auto !important;
          }
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 z-[99999]" aria-hidden>
        <CursorRing x={ringX} y={ringY} scale={ringScale} opacity={ringOpacity} />
        <CursorDot x={mouseX} y={mouseY} />
      </div>
    </>,
    document.body,
  );
}

function CursorRing({
  x,
  y,
  scale,
  opacity,
}: {
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  opacity: MotionValue<number>;
}) {
  return (
    <motion.div
      className="absolute top-0 left-0 h-10 w-10 rounded-full border border-white will-change-transform"
      style={{
        x,
        y,
        scale,
        opacity,
        translateX: "-50%",
        translateY: "-50%",
      }}
    />
  );
}

function CursorDot({ x, y }: { x: MotionValue<number>; y: MotionValue<number> }) {
  return (
    <motion.div
      className="absolute top-0 left-0 h-1 w-1 rounded-full bg-white will-change-transform"
      style={{
        x,
        y,
        translateX: "-50%",
        translateY: "-50%",
      }}
    />
  );
}
