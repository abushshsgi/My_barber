import { cn } from "@/lib/utils";

export type ApiBookingStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "confirmed";

interface StatusBadgeProps {
  status: ApiBookingStatus;
}

const statusConfig: Record<
  ApiBookingStatus,
  { label: string; className: string; dot?: string; pulse?: boolean }
> = {
  pending: {
    label: "Kutilmoqda",
    className: "bg-warning/15 text-foreground border-warning/30",
    dot: "bg-warning",
    pulse: true,
  },
  accepted: {
    label: "Tasdiqlandi",
    className: "bg-success/15 text-success border-success/30",
    dot: "bg-success",
  },
  confirmed: {
    label: "Tasdiqlandi",
    className: "bg-success/15 text-success border-success/30",
    dot: "bg-success",
  },
  in_progress: {
    label: "Jarayonda",
    className: "bg-foreground text-background border-foreground",
    dot: "bg-gold",
    pulse: true,
  },
  rejected: {
    label: "Rad etildi",
    className: "bg-destructive/15 text-destructive border-destructive/30",
    dot: "bg-destructive",
  },
  completed: {
    label: "Bajarildi",
    className: "bg-foreground/5 text-foreground border-foreground/20",
    dot: "bg-foreground",
  },
  cancelled: {
    label: "Bekor qilindi",
    className: "bg-destructive/15 text-destructive border-destructive/30",
    dot: "bg-destructive",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        config.className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          config.dot,
          config.pulse && "animate-pulse",
        )}
      />
      {config.label}
    </span>
  );
}
