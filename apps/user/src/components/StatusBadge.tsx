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
    className: "bg-warning text-warning-foreground border-border",
    dot: "bg-warning",
    pulse: true,
  },
  accepted: {
    label: "Tasdiqlandi",
    className: "bg-success text-success-foreground border-border",
    dot: "bg-success",
  },
  confirmed: {
    label: "Tasdiqlandi",
    className: "bg-success text-success-foreground border-border",
    dot: "bg-success",
  },
  in_progress: {
    label: "Jarayonda",
    className: "bg-primary text-primary-foreground border-border",
    dot: "bg-gold",
    pulse: true,
  },
  rejected: {
    label: "Rad etildi",
    className: "bg-destructive text-destructive-foreground border-border",
    dot: "bg-destructive",
  },
  completed: {
    label: "Bajarildi",
    className: "bg-accent text-accent-foreground border-border",
    dot: "bg-foreground",
  },
  cancelled: {
    label: "Bekor qilindi",
    className: "bg-destructive text-destructive-foreground border-border",
    dot: "bg-destructive",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-0.5 text-[11px] font-extrabold shadow-soft",
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
