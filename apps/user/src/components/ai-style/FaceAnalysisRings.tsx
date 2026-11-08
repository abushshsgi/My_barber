import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AiAnalysisResult } from "@/components/ai-style/ai-style-shared";
import { cn } from "@/lib/utils";

type MetricCard = {
  key: string;
  label: string;
  detail: string;
  percent: number;
  color: string;
};

function toPercent(value: number | undefined, fallback: number): number {
  const raw = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const pct = raw <= 1 ? raw * 100 : raw;
  return Math.max(8, Math.min(100, Math.round(pct)));
}

function MiniRing({
  percent,
  color,
  fill,
  displayPercent,
  size = 48,
}: {
  percent: number;
  color: string;
  fill: number;
  displayPercent: number;
  size?: number;
}) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (fill * percent) / 100);

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E8E8E8"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 80ms linear" }}
        />
      </svg>
      <span className="relative text-[12px] font-extrabold tracking-tight text-[#0A0A0A]">
        {displayPercent}%
      </span>
    </div>
  );
}

function tweenFill(
  from: number,
  to: number,
  duration: number,
  onFrame: (v: number) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      onFrame(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

export function FaceAnalysisRings({
  result,
  compact,
  sequential,
  onRevealComplete,
  className,
}: {
  result: AiAnalysisResult;
  compact?: boolean;
  /** Yuz → rang → soch, aylanma to‘lishi bilan. */
  sequential?: boolean;
  onRevealComplete?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const cards = useMemo<MetricCard[]>(
    () => [
      {
        key: "face",
        label: "YUZ",
        detail: t(`aiStylePage.faceShapes.${result.faceShapeKey}`),
        percent: toPercent(result.faceConfidence, 0.86),
        color: "#111111",
      },
      {
        key: "color",
        label: "RANG",
        detail: t(`aiStylePage.hairColors.${result.hairColorKey ?? "other"}`),
        percent: toPercent(result.hairColorConfidence, 0.74),
        color: "#E85D04",
      },
      {
        key: "hair",
        label: "SOCH",
        detail: t(`aiStylePage.hairTypes.${result.hairTypeKey}`),
        percent: toPercent(result.hairTypeConfidence, 0.78),
        color: "#3B6EF5",
      },
    ],
    [result, t],
  );

  const [visible, setVisible] = useState(sequential ? 0 : cards.length);
  const [fills, setFills] = useState(sequential ? [0, 0, 0] : [1, 1, 1]);
  const [pcts, setPcts] = useState(
    sequential ? [0, 0, 0] : cards.map((card) => card.percent),
  );
  const doneRef = useRef(onRevealComplete);
  doneRef.current = onRevealComplete;

  useEffect(() => {
    if (!sequential) {
      setVisible(cards.length);
      setFills([1, 1, 1]);
      setPcts(cards.map((card) => card.percent));
      return;
    }

    let cancelled = false;
    setVisible(0);
    setFills([0, 0, 0]);
    setPcts([0, 0, 0]);

    const run = async () => {
      for (let i = 0; i < cards.length; i += 1) {
        if (cancelled) return;
        setVisible(i + 1);
        const card = cards[i];
        await tweenFill(0, 1, 780, (v) => {
          if (cancelled) return;
          setFills((prev) => {
            const next = [...prev];
            next[i] = v;
            return next;
          });
          setPcts((prev) => {
            const next = [...prev];
            next[i] = Math.round(v * card.percent);
            return next;
          });
        });
        if (cancelled) return;
        await new Promise((r) => window.setTimeout(r, 180));
      }
      if (!cancelled) doneRef.current?.();
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [sequential, cards]);

  return (
    <div className={cn(compact ? "space-y-0" : "space-y-2", className)}>
      <div className="flex items-stretch justify-between gap-1.5">
        {cards.map((card, index) => {
          const shown = index < visible;
          return (
            <div
              key={card.key}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 px-0.5 py-1 transition-all duration-400 ease-out",
                shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0",
              )}
            >
              <p className="text-center text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#0A0A0A]">
                {card.label}
              </p>
              <MiniRing
                percent={card.percent}
                color={card.color}
                fill={fills[index] ?? 0}
                displayPercent={pcts[index] ?? 0}
                size={compact ? 46 : 52}
              />
              <p className="min-h-[28px] px-0.5 text-center text-[11px] font-semibold leading-tight text-[#0A0A0A]">
                {shown ? card.detail : ""}
              </p>
            </div>
          );
        })}
      </div>
      {!compact && result.summaryUz ? (
        <p className="px-0.5 text-[12px] font-medium leading-[17px] text-[#0A0A0A]">{result.summaryUz}</p>
      ) : null}
    </div>
  );
}
