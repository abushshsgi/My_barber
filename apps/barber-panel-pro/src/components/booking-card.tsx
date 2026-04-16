import type { BookingApi } from "@/lib/api-types";
import { useTimer } from "@/hooks/use-timer";
import { cn } from "@/lib/utils";
import { Clock, Play, CheckCircle2 } from "lucide-react";
import { useCompleteBooking, useStartBooking } from "@/lib/booking-queries";

type UiStatus = "accepted" | "in_progress" | "completed";

const statusStyles: Record<UiStatus, string> = {
  accepted: "bg-muted text-muted-foreground",
  in_progress: "bg-foreground text-background",
  completed: "bg-accent text-accent-foreground",
};

const statusLabels: Record<UiStatus, string> = {
  accepted: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
};

function TimerDisplay({ startedAt }: { startedAt?: number }) {
  const { formatted } = useTimer(startedAt);
  return <span className="font-mono text-sm tabular-nums">{formatted}</span>;
}

function toUiStatus(status: BookingApi["status"]): UiStatus {
  if (status === "in_progress") return "in_progress";
  if (status === "completed") return "completed";
  return "accepted";
}

function hhmm(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function BookingCard({ booking, compact }: { booking: BookingApi; compact?: boolean }) {
  const start = useStartBooking();
  const complete = useCompleteBooking();
  const uiStatus = toUiStatus(booking.status);
  const serviceLabel = booking.lines?.length
    ? booking.lines.map((l) => l.service_name).filter(Boolean).join(" + ")
    : "Service";
  const startedAtMs = booking.started_at ? new Date(booking.started_at).getTime() : undefined;

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm",
      uiStatus === "in_progress" && "ring-1 ring-foreground/10"
    )}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">{booking.customer_name || "Client"}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{serviceLabel}</p>
        </div>
        <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", statusStyles[uiStatus])}>
          {statusLabels[uiStatus]}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
            {hhmm(booking.start_at)}
          </span>
          <span>${booking.total_price}</span>
        </div>

        {uiStatus === "in_progress" && (
          <TimerDisplay startedAt={startedAtMs} />
        )}
      </div>

      {!compact && uiStatus !== "completed" && (
        <div className="mt-3 flex gap-2">
          {uiStatus === "accepted" && (
            <button
              onClick={() => start.mutate(booking.id)}
              disabled={start.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              <Play className="h-3 w-3" />
              Start
            </button>
          )}
          {uiStatus === "in_progress" && (
            <button
              onClick={() => complete.mutate(booking.id)}
              disabled={complete.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
