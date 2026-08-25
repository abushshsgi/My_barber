import { gsap } from "gsap";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type MonopoCursorProps = {
  /** Hover scale on links/buttons (default 1.45). */
  hoverScale?: number;
  /** Lag duration in seconds (default 0.5). */
  lag?: number;
};

/**
 * monopo.vn-style custom cursor: white ring + center dot,
 * GSAP quickTo lag, hover scale on interactive elements.
 * Desktop / fine pointer only.
 */
export function MonopoCursor({ hoverScale = 1.45, lag = 0.5 }: MonopoCursorProps) {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    const ring = ringRef.current;
    const dot = dotRef.current;
    const root = rootRef.current;
    if (!ring || !dot || !root) return;

    document.documentElement.classList.add("monopo-cursor-active");

    const xTo = gsap.quickTo(ring, "x", { duration: lag, ease: "power3.out" });
    const yTo = gsap.quickTo(ring, "y", { duration: lag, ease: "power3.out" });
    const xDot = gsap.quickTo(dot, "x", { duration: lag * 0.35, ease: "power3.out" });
    const yDot = gsap.quickTo(dot, "y", { duration: lag * 0.35, ease: "power3.out" });

    gsap.set([ring, dot], { xPercent: -50, yPercent: -50 });

    let visible = false;
    const show = () => {
      if (visible) return;
      visible = true;
      gsap.to(root, { opacity: 1, duration: 0.25, overwrite: "auto" });
    };
    const hide = () => {
      visible = false;
      gsap.to(root, { opacity: 0, duration: 0.2, overwrite: "auto" });
    };

    const onMove = (e: MouseEvent) => {
      show();
      xTo(e.clientX);
      yTo(e.clientY);
      xDot(e.clientX);
      yDot(e.clientY);
    };

    const interactiveSelector =
      'a, button, [role="button"], input, textarea, select, label, summary, [data-cursor="hover"]';

    const onOver = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (!t.closest(interactiveSelector)) return;
      gsap.to(ring, {
        scale: hoverScale,
        opacity: 0.95,
        borderWidth: 1.5,
        duration: 0.35,
        ease: "power3.out",
        overwrite: "auto",
      });
      gsap.to(dot, { scale: 0.55, duration: 0.35, ease: "power3.out", overwrite: "auto" });
    };

    const onOut = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (!t.closest(interactiveSelector)) return;
      const related = e.relatedTarget;
      if (related instanceof Element && related.closest(interactiveSelector)) return;
      gsap.to(ring, {
        scale: 1,
        opacity: 0.85,
        borderWidth: 1,
        duration: 0.4,
        ease: "power3.out",
        overwrite: "auto",
      });
      gsap.to(dot, { scale: 1, duration: 0.4, ease: "power3.out", overwrite: "auto" });
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", onOut, true);
    document.addEventListener("mouseleave", hide);
    window.addEventListener("blur", hide);

    return () => {
      document.documentElement.classList.remove("monopo-cursor-active");
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mouseout", onOut, true);
      document.removeEventListener("mouseleave", hide);
      window.removeEventListener("blur", hide);
      gsap.killTweensOf([ring, dot, root]);
    };
  }, [hoverScale, lag]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <style>{`
        html.monopo-cursor-active,
        html.monopo-cursor-active * {
          cursor: none !important;
        }
        @media (pointer: coarse), (prefers-reduced-motion: reduce) {
          html.monopo-cursor-active,
          html.monopo-cursor-active * {
            cursor: auto !important;
          }
        }
      `}</style>
      <div
        ref={rootRef}
        className="pointer-events-none fixed inset-0 z-[99999] opacity-0"
        aria-hidden
      >
        <div
          ref={ringRef}
          className="absolute top-0 left-0 size-10 rounded-full border border-white opacity-85 will-change-transform"
          style={{ boxSizing: "border-box" }}
        />
        <div
          ref={dotRef}
          className="absolute top-0 left-0 size-1.5 rounded-full bg-white will-change-transform"
        />
      </div>
    </>,
    document.body,
  );
}
