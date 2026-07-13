import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnimatedNumber } from "@/hooks/use-animated-number";

export function LivePulseBadge({ label = "Real vaqt" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      {label}
    </span>
  );
}

export function LiveMetricHero({
  label,
  value,
  sublabel,
  icon: Icon,
  accent = "blue",
  todayDelta,
  className,
}: {
  label: string;
  value: number;
  sublabel?: string;
  icon: LucideIcon;
  accent?: "blue" | "purple" | "emerald" | "amber";
  todayDelta?: number;
  className?: string;
}) {
  const animated = useAnimatedNumber(value);

  const accents = {
    blue: {
      ring: "ring-blue-500/20",
      grad: "from-blue-500/10 via-card to-card",
      icon: "bg-blue-500 text-white shadow-blue-500/25",
      glow: "shadow-[0_0_40px_-12px_rgba(59,130,246,0.45)]",
    },
    purple: {
      ring: "ring-purple-500/20",
      grad: "from-purple-500/10 via-card to-card",
      icon: "bg-purple-500 text-white shadow-purple-500/25",
      glow: "shadow-[0_0_40px_-12px_rgba(168,85,247,0.45)]",
    },
    emerald: {
      ring: "ring-emerald-500/20",
      grad: "from-emerald-500/10 via-card to-card",
      icon: "bg-emerald-500 text-white shadow-emerald-500/25",
      glow: "shadow-[0_0_40px_-12px_rgba(16,185,129,0.45)]",
    },
    amber: {
      ring: "ring-amber-500/20",
      grad: "from-amber-500/10 via-card to-card",
      icon: "bg-amber-500 text-white shadow-amber-500/25",
      glow: "shadow-[0_0_40px_-12px_rgba(245,158,11,0.45)]",
    },
  }[accent];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br p-6 sm:p-7",
        accents.grad,
        accents.ring,
        "ring-1",
        accents.glow,
        "transition-transform duration-500 hover:scale-[1.01]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {typeof todayDelta === "number" ? (
            <p className="mt-1 text-xs font-semibold text-emerald-600">
              +{todayDelta} bugun
            </p>
          ) : null}
        </div>
        <span className={cn("grid size-11 place-items-center rounded-xl shadow-lg", accents.icon)}>
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-5 font-heading text-5xl font-bold tabular-nums tracking-tight text-foreground sm:text-6xl lg:text-7xl">
        {animated.toLocaleString()}
      </p>
      {sublabel ? <p className="mt-2 text-sm text-muted-foreground">{sublabel}</p> : null}
    </div>
  );
}
