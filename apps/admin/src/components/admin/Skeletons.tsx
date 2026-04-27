import { cn } from "@/lib/utils";

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className={cn("h-3 rounded bg-muted animate-pulse", j === 0 ? "w-1/4" : "flex-1")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-card rounded-2xl p-5 border border-border min-h-[120px] flex flex-col justify-between",
        className,
      )}
    >
      <div className="h-3 w-24 rounded bg-muted animate-pulse" />
      <div>
        <div className="h-7 w-32 rounded bg-muted animate-pulse" />
        <div className="mt-2 h-3 w-16 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}
