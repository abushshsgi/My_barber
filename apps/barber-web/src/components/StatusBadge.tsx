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
  { label: string; className: string; pulse?: boolean }
> = {
  pending: {
    label: "Kutilmoqda",
    className: "bg-warning/15 text-warning border-warning/20",
    pulse: true,
  },
  accepted: {
    label: "Tasdiqlandi",
    className: "bg-success/15 text-success border-success/20",
  },
  confirmed: {
    label: "Tasdiqlandi",
    className: "bg-success/15 text-success border-success/20",
  },
  in_progress: {
    label: "Jarayonda",
    className: "bg-accent/15 text-accent border-accent/20",
  },
  rejected: {
    label: "Rad etildi",
    className: "bg-destructive/15 text-destructive border-destructive/20",
  },
  completed: {
    label: "Bajarildi",
    className: "bg-accent/15 text-accent border-accent/20",
  },
  cancelled: {
    label: "Bekor qilindi",
    className: "bg-destructive/15 text-destructive border-destructive/20",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        config.className
      )}
    >
      {config.pulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-warning mr-1.5 animate-pulse" />
      )}
      {!config.pulse && status === "accepted" && (
        <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />
      )}
      {config.label}
    </span>
  );
}
