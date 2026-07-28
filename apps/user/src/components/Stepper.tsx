import { cn } from "@/lib/utils";

interface Props {
  steps: string[];
  current: number; // 1-based
  showLabels?: boolean;
}

export function Stepper({ steps, current, showLabels = false }: Props) {
  return (
    <div className="flex items-start gap-2">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  done && "bg-foreground text-background",
                  active && "bg-foreground text-background ring-4 ring-foreground/15",
                  !done && !active && "bg-surface text-muted-foreground",
                )}
              >
                {done ? "✓" : idx}
              </div>
              {showLabels ? (
                <span
                  className={cn(
                    "w-full truncate text-center text-[9px] font-semibold leading-tight",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              ) : null}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mb-3 h-[2px] min-w-2 flex-1 rounded-full",
                  done ? "bg-foreground" : "bg-surface-2",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
