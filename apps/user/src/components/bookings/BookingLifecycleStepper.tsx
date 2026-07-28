import {
  buildLifecycleSteps,
  type BookingLifecycleStatus,
} from "@mybarber/shared/booking-lifecycle";
import type { BookingItem } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function toLifecycleStatus(status: BookingItem["status"]): BookingLifecycleStatus {
  if (status === "done") return "completed";
  return status;
}

const SHORT_LABELS: Record<string, string> = {
  requested: "So'rov",
  confirmed: "Tasdiq",
  checked_in: "Kelish",
  in_service: "Xizmat",
  done: "Tugadi",
};

export function BookingLifecycleStepper({
  status,
  checkedIn = false,
}: {
  status: BookingItem["status"];
  checkedIn?: boolean;
}) {
  const steps = buildLifecycleSteps(toLifecycleStatus(status), checkedIn);

  if (status === "cancelled") return null;

  const currentIdx = steps.findIndex((s) => s.state === "current");

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const done = step.state === "done";
        const active = step.state === "current";
        const upcoming = step.state === "upcoming";
        return (
          <div key={step.id} className="flex flex-1 items-center gap-1">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  done && "bg-foreground text-background",
                  active && "bg-foreground text-background ring-2 ring-foreground/20",
                  upcoming && "bg-muted text-muted-foreground",
                )}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "w-full truncate text-center text-[9px] font-semibold leading-tight",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {SHORT_LABELS[step.id] ?? step.label}
              </span>
            </div>
            {i < steps.length - 1 ? (
              <div
                className={cn(
                  "mb-3 h-0.5 w-full min-w-2 flex-1 rounded-full",
                  i < currentIdx || done ? "bg-foreground" : "bg-border",
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
