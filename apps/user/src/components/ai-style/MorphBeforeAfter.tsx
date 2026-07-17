import { motion, type PanInfo } from "framer-motion";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  title?: string;
  className?: string;
};

/**
 * Drag right → reveal Before, drag left → reveal After.
 */
export function MorphBeforeAfter({ beforeSrc, afterSrc, title, className }: Props) {
  const { t } = useTranslation();
  const [pos, setPos] = useState(0.5);

  const onPan = useCallback((_: unknown, info: PanInfo) => {
    const width = typeof window !== "undefined" ? Math.min(window.innerWidth, 480) : 360;
    const delta = info.delta.x / width;
    setPos((prev) => Math.min(1, Math.max(0, prev + delta)));
  }, []);

  return (
    <div className={cn("relative select-none overflow-hidden rounded-[24px] bg-black touch-none", className)}>
      <div className="relative aspect-[3/4] w-full">
        <img
          src={afterSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-top"
          draggable={false}
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${(1 - pos) * 100}% 0 0)` }}
        >
          <img
            src={beforeSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top"
            draggable={false}
          />
        </div>

        <div
          className="absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_12px_rgba(0,0,0,0.45)]"
          style={{ left: `${pos * 100}%` }}
        >
          <div className="absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-black/10 bg-white text-xs font-bold text-black shadow-lg">
            ↔
          </div>
        </div>

        <motion.div className="absolute inset-0 z-20" onPan={onPan} />

        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
          {t("aiStylePage.beforeAfter.before", { defaultValue: "Before" })}
        </div>
        <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
          {t("aiStylePage.beforeAfter.after", { defaultValue: "After" })}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-12">
          {title ? <p className="text-sm font-bold text-white">{title}</p> : null}
          <p className={cn("text-[11px] text-white/75", title && "mt-1")}>
            {t("aiStylePage.beforeAfter.hint", {
              defaultValue: "O‘ngga — Before · Chapga — After",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
