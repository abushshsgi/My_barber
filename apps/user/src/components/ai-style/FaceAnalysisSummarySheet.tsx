import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { FaceAnalysisRings } from "@/components/ai-style/FaceAnalysisRings";
import type { AiAnalysisResult } from "@/components/ai-style/ai-style-shared";

const THUMB = 46;
const ACCENT = "#C026A0";

function GenerateSlider({ onComplete }: { onComplete: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const startX = useRef(0);
  const origin = useRef(0);
  const done = useRef(false);

  const maxTravel = () => {
    const width = trackRef.current?.clientWidth ?? 0;
    return Math.max(0, width - THUMB - 8);
  };

  const finishIfNeeded = (next: number) => {
    const max = maxTravel();
    if (max > 0 && next / max >= 0.82 && !done.current) {
      done.current = true;
      setX(max);
      onComplete();
    }
  };

  return (
    <div
      ref={trackRef}
      className="relative h-[52px] w-full overflow-hidden rounded-full border border-black/[0.06] bg-[#F3F3F3]"
      onClick={() => {
        if (done.current) return;
        done.current = true;
        setX(maxTravel());
        onComplete();
      }}
    >
      <p className="pointer-events-none absolute inset-0 grid place-items-center text-[15px] font-bold tracking-wide text-[#0A0A0A]">
        Generate
      </p>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="ml-[28%] flex animate-pulse items-center text-[#C026A0]">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="text-lg font-black leading-none"
              style={{ opacity: 0.35 + i * 0.18, marginLeft: i === 0 ? 0 : -6, color: ACCENT }}
            >
              ›
            </span>
          ))}
        </span>
      </div>
      <button
        type="button"
        aria-label="Generate"
        className="absolute top-1 left-1 grid size-[44px] place-items-center rounded-full border border-black/[0.06] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.1)] touch-none"
        style={{ transform: `translateX(${x}px)` }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          startX.current = event.clientX;
          origin.current = x;
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId) || done.current) return;
          const max = maxTravel();
          const next = Math.max(0, Math.min(max, origin.current + event.clientX - startX.current));
          setX(next);
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
          if (done.current) return;
          const max = maxTravel();
          const ratio = max > 0 ? x / max : 0;
          if (ratio >= 0.82) {
            finishIfNeeded(x);
            return;
          }
          setX(0);
        }}
      >
        <Sparkles className="h-5 w-5 text-[#111]" strokeWidth={2.2} />
      </button>
    </div>
  );
}

export function FaceAnalysisSummarySheet({
  result,
  onStartGenerate,
}: {
  result: AiAnalysisResult;
  onStartGenerate: () => void;
}) {
  const [showGenerate, setShowGenerate] = useState(false);

  return (
    <div
      className="w-full rounded-t-[28px] bg-white px-4 pt-3.5"
      style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
    >
      <FaceAnalysisRings
        result={result}
        compact
        sequential
        onRevealComplete={() => setShowGenerate(true)}
      />
      <div className="mt-3 min-h-[52px]">
        <AnimatePresence>
          {showGenerate ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <GenerateSlider onComplete={onStartGenerate} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
