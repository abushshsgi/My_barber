import { cn } from "@/lib/utils";

export type StatusVariant =
  | "pending"
  | "confirmed"
  | "in_chair"
  | "completed"
  | "cancelled"
  | "active"
  | "inactive"
  | "published"
  | "draft";

const VARIANTS: Record<StatusVariant, { label: string; className: string }> = {
  pending: {
    label: "Kutilmoqda",
    className: "bg-warning/15 text-warning-foreground border-warning/20",
  },
  confirmed: {
    label: "Tasdiqlangan",
    className: "bg-info/15 text-info border-info/20",
  },
  in_chair: {
    label: "Kresloda",
    className: "bg-warning/15 text-[oklch(0.45_0.14_75)] border-warning/30",
  },
  completed: {
    label: "Yakunlandi",
    className: "bg-success/15 text-success border-success/20",
  },
  cancelled: {
    label: "Bekor qilindi",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  active: {
    label: "Faol",
    className: "bg-success/15 text-success border-success/20",
  },
  inactive: {
    label: "Faol emas",
    className: "bg-muted text-muted-foreground border-border",
  },
  published: {
    label: "Chiqarilgan",
    className: "bg-foreground text-background border-foreground",
  },
  draft: {
    label: "Tekshiruvda",
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function StatusBadge({
  status,
  className,
  label,
}: {
  status: StatusVariant;
  className?: string;
  label?: string;
}) {
  const v = VARIANTS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        v.className,
        className,
      )}
    >
      {label ?? v.label}
    </span>
  );
}
