import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  steps: string[];
  current: number; // 1-based
  size?: number;
}

/**
 * Radial Step Indicator — circular progress ring with current step copy
 * inside the ring. Used inside the booking wizard.
 */
export function RadialStepIndicator({ steps, current, size = 84 }: Props) {
  const reduce = useReducedMotion();
  const total = steps.length;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(current / total, 1);
  const offset = circumference * (1 - progress);
  const currentLabel = steps[Math.max(0, current - 1)];
  const nextLabel = steps[current] ?? null;

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-surface-2)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={reduce ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: reduce ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-lg font-semibold leading-none tabular-nums">
            {current}
            <span className="text-muted-foreground">/{total}</span>
          </span>
          <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Qadam
          </span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
          Hozir
        </p>
        <h2 className="mt-0.5 font-display text-xl font-semibold leading-tight tracking-tight">
          {currentLabel}
        </h2>
        {nextLabel ? (
          <p className="mt-1 truncate text-[11px] font-semibold text-muted-foreground">
            Keyingi: <span className="text-foreground">{nextLabel}</span>
          </p>
        ) : (
          <p className="mt-1 truncate text-[11px] font-semibold text-muted-foreground">
            Yakuniy qadam
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {steps.map((_, i) => {
          const idx = i + 1;
          const active = idx === current;
          const done = idx < current;
          return (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                active ? "w-5 bg-gold" : done ? "w-2.5 bg-foreground" : "w-2.5 bg-surface-2",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
