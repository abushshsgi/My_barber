import { useCallback, useRef } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { Nfc } from "lucide-react";
import { userProfile, walletSummary } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const TILT_SPRING = { type: "spring" as const, stiffness: 320, damping: 24 };
const MAX_TILT_Y = 22;
const MAX_TILT_X = 16;

const CARD = {
  body: "linear-gradient(135deg, oklch(0.145 0 0), oklch(0.1 0 0))",
  cream: "linear-gradient(180deg, oklch(0.99 0.01 97) 0%, oklch(0.95 0.02 90) 45%, oklch(0.9 0.03 88) 100%)",
  shadow: "0 24px 56px -20px oklch(0.145 0 0 / 0.24)",
} as const;

function EmvChip() {
  return (
    <div className="relative h-[28px] w-[38px] shrink-0" aria-hidden>
      <div
        className="absolute inset-0 rounded-[5px] border border-foreground/25"
        style={{
          background: "linear-gradient(148deg, oklch(0.84 0.06 85), oklch(0.58 0.05 75))",
          boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.35)",
        }}
      />
      <div className="absolute inset-[3px] rounded-[3px] border border-foreground/20 bg-foreground/10" />
    </div>
  );
}

export function PlasticCard() {
  const reduced = useReducedMotion();
  const cardRef = useRef<HTMLElement>(null);
  const pressing = useRef(false);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const resetTilt = useCallback(() => {
    animate(rotateX, 0, TILT_SPRING);
    animate(rotateY, 0, TILT_SPRING);
  }, [rotateX, rotateY]);

  const applyTilt = useCallback(
    (clientX: number, clientY: number) => {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dx = ((clientX - rect.left) / rect.width - 0.5) * 2;
      const dy = ((clientY - rect.top) / rect.height - 0.5) * 2;
      rotateY.set(dx * MAX_TILT_Y);
      rotateX.set(-dy * MAX_TILT_X);
    },
    [rotateX, rotateY],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (reduced) return;
      pressing.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      applyTilt(e.clientX, e.clientY);
    },
    [reduced, applyTilt],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!pressing.current || reduced) return;
      applyTilt(e.clientX, e.clientY);
    },
    [reduced, applyTilt],
  );

  const endTilt = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!pressing.current) return;
      pressing.current = false;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      resetTilt();
    },
    [resetTilt],
  );

  return (
    <div className="w-full max-w-[340px]" style={{ perspective: 1100 }}>
      <motion.article
        ref={cardRef}
        className={cn(
          "relative aspect-[1.586/1] w-full touch-none select-none overflow-hidden rounded-[26px]",
          !reduced && "cursor-grab active:cursor-grabbing",
        )}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          touchAction: "none",
          transformOrigin: "50% 55%",
          background: CARD.body,
          boxShadow: CARD.shadow,
        }}
        initial={reduced ? false : { opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        whileTap={reduced ? undefined : { scale: 0.98 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endTilt}
        onPointerCancel={endTilt}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[52%] rounded-b-[28px]"
          style={{
            background: CARD.cream,
            boxShadow: "0 10px 28px -12px oklch(0.145 0 0 / 0.18)",
          }}
          aria-hidden
        />

        <div className="relative z-20 flex h-[52%] flex-col justify-end px-5 pb-5 pt-4 text-foreground">
          <p className="text-[40px] font-semibold leading-none tracking-tight tabular-nums">
            {walletSummary.balance.toLocaleString("uz-UZ")}
            <span className="ml-1.5 text-lg font-semibold text-muted-foreground">so'm</span>
          </p>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 flex h-[48%] flex-col justify-between px-5 pb-5 pt-4 text-background">
          <div className="flex items-start justify-between gap-3">
            <EmvChip />
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-background text-foreground shadow-sm">
              <Nfc className="h-5 w-5" strokeWidth={2.2} aria-hidden />
            </div>
          </div>

          <div className="flex items-end justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-semibold uppercase tracking-wide">
              {userProfile.name}
            </p>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.28em] text-background/55">
              mysaloon
            </span>
          </div>
        </div>
      </motion.article>
    </div>
  );
}
