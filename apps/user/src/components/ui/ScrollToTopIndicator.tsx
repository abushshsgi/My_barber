import { ChevronUp } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const SHOW_AFTER_PX = 280;
const SIZE = 48;
const STROKE = 2.5;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

type Props = {
  className?: string;
};

export function ScrollToTopIndicator({ className }: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      setVisible(y > SHOW_AFTER_PX);
      setProgress(Math.min(1, Math.max(0, y / max)));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const scrollTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }, [reduced]);

  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.88, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 10 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          onClick={scrollTop}
          aria-label={t("scrollToTop.label", { defaultValue: "Yuqoriga" })}
          className={cn(
            "fixed z-40 hidden place-items-center rounded-full border border-border bg-background/95 text-foreground shadow-[0_10px_32px_-12px_rgba(0,0,0,0.35)] backdrop-blur-md transition-transform active:scale-95 lg:grid",
            "lg:bottom-8 lg:right-8",
            className,
          )}
          style={{ width: SIZE, height: SIZE }}
        >
          <svg
            className="absolute inset-0 -rotate-90"
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            aria-hidden
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              className="text-border/80"
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              strokeLinecap="round"
              className="text-foreground"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ transition: reduced ? undefined : "stroke-dashoffset 0.12s linear" }}
            />
          </svg>
          <ChevronUp className="relative h-5 w-5" strokeWidth={2.4} />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
