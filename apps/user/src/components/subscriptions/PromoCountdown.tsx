import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

export function formatPromoCountdown(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (days > 0) {
    return { days, hours, mins, secs, label: `${days}k ${pad(hours)}:${pad(mins)}:${pad(secs)}` };
  }
  return { days: 0, hours, mins, secs, label: `${pad(hours)}:${pad(mins)}:${pad(secs)}` };
}

type Props = {
  endsAt?: string | null;
  /** Serverdan kelgan boshlang‘ich qoldiq (ixtiyoriy). */
  initialSecondsLeft?: number | null;
  className?: string;
  compact?: boolean;
  /** Light text on dark bg */
  inverted?: boolean;
  /** ghost = shaffof borderli kataklar (glass banner) */
  tone?: "solid" | "ghost";
};

/** Live countdown — promokod muddati. */
export function PromoCountdown({
  endsAt,
  initialSecondsLeft,
  className,
  compact,
  inverted,
  tone = "solid",
}: Props) {
  const [left, setLeft] = useState(() => {
    if (endsAt) {
      const ms = Date.parse(endsAt) - Date.now();
      return Math.max(0, Math.floor(ms / 1000));
    }
    return Math.max(0, initialSecondsLeft ?? 0);
  });

  useEffect(() => {
    const tick = () => {
      if (endsAt) {
        const ms = Date.parse(endsAt) - Date.now();
        setLeft(Math.max(0, Math.floor(ms / 1000)));
        return;
      }
      setLeft((v) => Math.max(0, v - 1));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (left <= 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-[11px] font-bold",
          inverted ? "text-background/55" : "text-muted-foreground",
          className,
        )}
      >
        <Clock className="size-3.5" strokeWidth={2.25} />
        Muddati tugadi
      </span>
    );
  }

  const parts = formatPromoCountdown(left);

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 tabular-nums text-[11px] font-bold tracking-tight",
          inverted ? "text-background" : "text-foreground",
          className,
        )}
      >
        <Clock className="size-3.5 shrink-0 opacity-70" strokeWidth={2.25} />
        {parts.label}
      </span>
    );
  }

  const cells =
    parts.days > 0
      ? [
          { v: pad(parts.days), u: "kun" },
          { v: pad(parts.hours), u: "soat" },
          { v: pad(parts.mins), u: "daq" },
          { v: pad(parts.secs), u: "sek" },
        ]
      : [
          { v: pad(parts.hours), u: "soat" },
          { v: pad(parts.mins), u: "daq" },
          { v: pad(parts.secs), u: "sek" },
        ];

  const ghost = tone === "ghost";

  return (
    <div className={cn("flex flex-wrap items-end gap-1", className)}>
      {cells.map((c, i) => (
        <span key={c.u} className="flex items-end gap-1">
          {i > 0 && ghost ? (
            <span className="mb-2.5 text-[11px] font-medium text-muted-foreground/50" aria-hidden>
              :
            </span>
          ) : null}
          <span
            className={cn(
              "min-w-[2.5rem] px-1.5 py-1 text-center",
              ghost
                ? "rounded-lg border border-black/[0.08] bg-white/40 text-foreground"
                : cn(
                    "rounded-xl px-2 py-1.5",
                    inverted ? "bg-background/15 text-background" : "bg-foreground text-background",
                  ),
            )}
          >
            <span
              className={cn(
                "block leading-none tabular-nums tracking-tight",
                ghost ? "text-[13px] font-semibold" : "text-[15px] font-bold",
              )}
            >
              {c.v}
            </span>
            <span
              className={cn(
                "mt-0.5 block text-[8px] font-semibold uppercase tracking-wider",
                ghost
                  ? "text-muted-foreground"
                  : inverted
                    ? "text-background/55"
                    : "text-background/55",
              )}
            >
              {c.u}
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}
