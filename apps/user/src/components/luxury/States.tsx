import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyStateLuxury({
  icon: Icon = Sparkles,
  title,
  body,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
      <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-muted text-foreground">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {body && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorStateLuxury({ title = "Xatolik", body, onRetry }: { title?: string; body?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-center">
      <h3 className="text-sm font-semibold text-destructive">{title}</h3>
      {body && <p className="mt-1 text-xs text-muted-foreground">{body}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          Qayta urinish
        </button>
      )}
    </div>
  );
}

export function LoadingSkeleton({ className = "h-24 w-full" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted ${className}`} />;
}

export function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-1">
      <div>
        {eyebrow && <p className="label-eyebrow">{eyebrow}</p>}
        <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}
