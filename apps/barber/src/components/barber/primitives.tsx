import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

// =================== StatusPill ===================
export type BarberStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "active"
  | "inactive";

const STATUS_MAP: Record<BarberStatus, { label: string; className: string }> = {
  pending: { label: "Kutilmoqda", className: "bg-muted text-foreground/70 border-border" },
  accepted: { label: "Tasdiqlangan", className: "bg-foreground/10 text-foreground border-foreground/20" },
  in_progress: { label: "Kresloda", className: "bg-foreground text-background border-foreground" },
  completed: { label: "Yakunlandi", className: "bg-background text-muted-foreground border-border" },
  cancelled: { label: "Bekor qilindi", className: "bg-destructive/10 text-destructive border-destructive/20" },
  active: { label: "Faol", className: "bg-foreground text-background border-foreground" },
  inactive: { label: "Faol emas", className: "bg-muted text-muted-foreground border-border" },
};

export function StatusPill({
  status,
  className,
  label,
}: {
  status: BarberStatus;
  className?: string;
  label?: string;
}) {
  const v = STATUS_MAP[status];
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

// =================== EmptyBlock ===================
export function EmptyBlock({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
      {icon && (
        <div className="mx-auto mb-3 size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="font-heading font-medium text-foreground">{title}</div>
      {description && (
        <div className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
          {description}
        </div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// =================== PageHeader ===================
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// =================== StatCard ===================
export function StatCard({
  icon,
  label,
  value,
  hint,
  trend,
}: {
  icon?: ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  trend?: { value: number; label?: string };
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-wider">{label}</span>
        {icon && <span>{icon}</span>}
      </div>
      <div className="mt-2 font-heading text-2xl font-semibold text-foreground">
        {value}
      </div>
      <div className="flex items-center gap-2 mt-1">
        {trend && (
          <span
            className={cn(
              "text-xs font-medium",
              trend.value >= 0 ? "text-foreground" : "text-destructive",
            )}
          >
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

// =================== SectionCard ===================
export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-card", className)}>
      {(title || actions) && (
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div>
            {title && <h2 className="font-heading text-lg font-semibold">{title}</h2>}
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
