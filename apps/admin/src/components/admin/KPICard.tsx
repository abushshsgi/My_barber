import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";

export function KPICard({
  label,
  value,
  delta,
  hint,
  icon: Icon,
  className,
  size = "default",
}: {
  label: string;
  value: string | number;
  delta?: number;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
  size?: "default" | "hero";
}) {
  const trend =
    typeof delta === "number" ? (delta > 0 ? "up" : delta < 0 ? "down" : "flat") : "flat";
  const isHero = size === "hero";

  return (
    <div
      className={cn(
        "bg-card rounded-2xl border border-border shadow-card flex flex-col justify-between",
        isHero ? "min-h-[168px] p-6 sm:p-7" : "min-h-[120px] p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className={cn(
            "font-medium text-muted-foreground",
            isHero ? "text-sm sm:text-base" : "text-sm",
          )}
        >
          {label}
        </div>
        {Icon && (
          <Icon className={cn("text-muted-foreground", isHero ? "size-5 sm:size-6" : "size-4")} />
        )}
      </div>
      <div className={cn(isHero ? "mt-4" : "mt-3")}>
        <div
          className={cn(
            "font-heading font-semibold tracking-tight tabular-nums text-foreground",
            isHero ? "text-5xl sm:text-6xl lg:text-7xl" : "text-3xl",
          )}
        >
          {value}
        </div>
        <div className="mt-2 flex items-center gap-2">
          {typeof delta === "number" && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium",
                trend === "up" && "bg-success/10 text-success",
                trend === "down" && "bg-destructive/10 text-destructive",
                trend === "flat" && "bg-muted text-muted-foreground",
              )}
            >
              {trend === "up" && <ArrowUpRight className="size-3" />}
              {trend === "down" && <ArrowDownRight className="size-3" />}
              {trend === "flat" && <Minus className="size-3" />}
              {delta > 0 ? "+" : ""}
              {delta}%
            </span>
          )}
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
      </div>
    </div>
  );
}
