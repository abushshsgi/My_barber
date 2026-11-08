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

function MiniRing({ percent, color }: { percent: number; color: string }) {
  const size = 54;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);

  return (
    <div className="relative grid size-[54px] place-items-center">
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
        />
      </svg>
      <span className="relative text-[13px] font-extrabold tracking-tight text-[#0A0A0A]">
        {percent}%
      </span>
    </div>
  );
}

export function FaceAnalysisRings({
  result,
  compact,
  className,
}: {
  result: AiAnalysisResult;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const cards: MetricCard[] = [
    {
      key: "face",
      label: "YUZ",
      detail: t(`aiStylePage.faceShapes.${result.faceShapeKey}`),
      percent: toPercent(result.faceConfidence, 0.86),
      color: "#111111",
    },
    {
      key: "length",
      label: "UZUNLIK",
      detail: t(`aiStylePage.hairTypes.${result.hairTypeKey}`),
      percent: toPercent(result.hairTypeConfidence, 0.78),
      color: "#3B6EF5",
    },
    {
      key: "color",
      label: "RANG",
      detail: t(`aiStylePage.hairColors.${result.hairColorKey ?? "other"}`),
      percent: toPercent(result.hairColorConfidence, 0.74),
      color: "#E85D04",
    },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-stretch justify-between gap-2">
        {cards.map((card) => (
          <div key={card.key} className="flex min-w-0 flex-1 flex-col items-center gap-2 px-1 py-2">
            <p className="text-center text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#0A0A0A]">
              {card.label}
            </p>
            <MiniRing percent={card.percent} color={card.color} />
            <p className="px-0.5 text-center text-[11px] font-semibold leading-tight text-[#0A0A0A]">
              {card.detail}
            </p>
          </div>
        ))}
      </div>
      {!compact && result.summaryUz ? (
        <p className="px-0.5 text-[12px] font-medium leading-[17px] text-[#0A0A0A]">{result.summaryUz}</p>
      ) : null}
    </div>
  );
}
