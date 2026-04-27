import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";

export function KPICard({
  label,
  value,
  delta,
  hint,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number;
  delta?: number;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  const trend =
    typeof delta === "number" ? (delta > 0 ? "up" : delta < 0 ? "down" : "flat") : "flat";

  return (
    <div
      className={cn(
        "bg-card rounded-2xl p-5 border border-border shadow-card flex flex-col justify-between min-h-[120px]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <div className="mt-3">
        <div className="font-heading text-3xl font-semibold tracking-tight tabular-nums text-foreground">
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
