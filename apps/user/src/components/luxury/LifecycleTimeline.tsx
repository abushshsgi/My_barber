import { Check, Clock, Hourglass, Sparkles, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "pending" | "accepted" | "done" | "cancelled";

const STEPS: { key: "pending" | "accepted" | "in_progress" | "done"; label: string; icon: typeof Clock }[] = [
  { key: "pending", label: "Kutmoqda", icon: Hourglass },
  { key: "accepted", label: "Tasdiqlandi", icon: Check },
  { key: "in_progress", label: "Jarayonda", icon: Sparkles },
  { key: "done", label: "Yakunlandi", icon: Check },
];

function lifecycleIndex(status: Status): number {
  switch (status) {
    case "pending":
      return 0;
    case "accepted":
      return 1;
    case "done":
      return 3;
    case "cancelled":
      return -1;
  }
}

/**
 * Timeline Journey — vertical stepper visualising a booking lifecycle.
 * Used inside MyBookings cards.
 */
export function LifecycleTimeline({ status }: { status: Status }) {
  const idx = lifecycleIndex(status);

  if (idx === -1) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2.5 text-[12px] font-semibold text-muted-foreground">
        <XCircle className="h-4 w-4 text-destructive" strokeWidth={2.2} />
        Bekor qilingan / rad etilgan
      </div>
    );
  }

  return (
    <ol className="grid grid-cols-4 gap-0">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        const Icon = s.icon;
        const last = i === STEPS.length - 1;
        return (
          <li key={s.key} className="relative flex flex-col items-center text-center">
            {/* connector */}
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-1/2 top-3 h-0.5 w-full",
                  done || active ? "bg-foreground" : "bg-surface-2",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 grid h-6 w-6 place-items-center rounded-full transition-colors",
                done && "bg-foreground text-background",
                active && "bg-gold text-onyx ring-4 ring-gold/20",
                !done && !active && "bg-surface-2 text-muted-foreground",
              )}
            >
              <Icon className="h-3 w-3" strokeWidth={2.6} />
            </span>
            <span
              className={cn(
                "mt-1.5 text-[10px] font-bold uppercase tracking-[0.1em]",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
