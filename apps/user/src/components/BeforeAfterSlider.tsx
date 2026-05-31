import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface Props {
  beforeSeed: string;
  afterSeed: string;
  label?: string;
}

/** Draggable before/after image comparison slider (mock gradients). */
export function BeforeAfterSlider({ beforeSeed, afterSeed, label }: Props) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);

  const move = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(2, Math.min(98, x)));
  }, []);

  const gradient = (seed: string) =>
    `linear-gradient(135deg, oklch(0.85 0.05 ${(seed.charCodeAt(0) * 30) % 360}), oklch(0.45 0.08 ${(seed.charCodeAt(0) * 30 + 80) % 360}))`;

  return (
    <div
      ref={ref}
      className="relative aspect-[4/3] w-full select-none overflow-hidden rounded-2xl"
      onMouseMove={(e) => e.buttons === 1 && move(e.clientX)}
      onTouchMove={(e) => move(e.touches[0].clientX)}
      onClick={(e) => move(e.clientX)}
    >
      <div className="absolute inset-0" style={{ background: gradient(beforeSeed) }}>
        <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          Oldin
        </span>
      </div>
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${pos}%`, background: gradient(afterSeed) }}
      >
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
          Keyin
        </span>
      </div>
      <motion.div
        className="absolute inset-y-0 w-0.5 bg-white shadow-lg"
        style={{ left: `${pos}%` }}
      >
        <div className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-xl">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3L1 7l4 4M9 3l4 4-4 4" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </motion.div>
      {label && (
        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white">
          {label}
        </p>
      )}
    </div>
  );
}
