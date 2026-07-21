import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { formatAdminUzsFull } from "@/lib/admin-analytics";
import { LivePulseBadge } from "@/components/admin/LiveMetricHero";

export function LiveMoneyHero({
  label,
  valueUzs,
  sublabel,
  icon: Icon,
  accent = "emerald",
  todayDeltaUzs,
  className,
}: {
  label: string;
  valueUzs: number;
  sublabel?: string;
  icon: LucideIcon;
  accent?: "blue" | "purple" | "emerald" | "amber";
  todayDeltaUzs?: number | null;
  className?: string;
}) {
  const animated = useAnimatedNumber(Math.round(valueUzs || 0), 1100);

  const accents = {
    blue: {
      ring: "ring-blue-500/20",
      grad: "from-blue-500/10 via-card to-card",
      icon: "bg-blue-500 text-white shadow-blue-500/25",
      glow: "shadow-[0_0_48px_-12px_rgba(59,130,246,0.45)]",
    },
    purple: {
      ring: "ring-violet-500/20",
      grad: "from-violet-500/10 via-card to-card",
      icon: "bg-violet-600 text-white shadow-violet-500/25",
      glow: "shadow-[0_0_48px_-12px_rgba(124,58,237,0.4)]",
    },
    emerald: {
      ring: "ring-emerald-500/20",
      grad: "from-emerald-500/10 via-card to-card",
      icon: "bg-emerald-600 text-white shadow-emerald-500/25",
      glow: "shadow-[0_0_48px_-12px_rgba(16,185,129,0.45)]",
    },
    amber: {
      ring: "ring-amber-500/20",
      grad: "from-amber-500/10 via-card to-card",
      icon: "bg-amber-500 text-white shadow-amber-500/25",
      glow: "shadow-[0_0_48px_-12px_rgba(245,158,11,0.45)]",
    },
  }[accent];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br p-6 sm:p-8",
        accents.grad,
        accents.ring,
        "ring-1",
        accents.glow,
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <LivePulseBadge label="Live" />
          </div>
          {typeof todayDeltaUzs === "number" && todayDeltaUzs > 0 ? (
            <p className="text-xs font-semibold text-emerald-700">
              +{formatAdminUzsFull(todayDeltaUzs)} bugun
            </p>
          ) : null}
        </div>
        <span className={cn("grid size-12 place-items-center rounded-2xl shadow-lg", accents.icon)}>
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-6 font-heading text-4xl font-bold tabular-nums tracking-tight text-foreground sm:text-5xl lg:text-6xl">
        {formatAdminUzsFull(animated)}
      </p>
      {sublabel ? <p className="mt-3 max-w-xl text-sm text-muted-foreground">{sublabel}</p> : null}
    </div>
  );
}
