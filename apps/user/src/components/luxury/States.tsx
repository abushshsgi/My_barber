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
    <div className="neo-panel flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-3 grid h-14 w-14 place-items-center rounded-lg border-2 border-border bg-accent text-accent-foreground shadow-soft">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="text-base font-extrabold text-foreground">{title}</h3>
      {body && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorStateLuxury({ title = "Xatolik", body, onRetry }: { title?: string; body?: string; onRetry?: () => void }) {
  return (
    <div className="neo-panel border-destructive bg-destructive/15 p-5 text-center">
      <h3 className="text-sm font-extrabold text-destructive">{title}</h3>
      {body && <p className="mt-1 text-xs text-muted-foreground">{body}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="neo-cta mt-3 bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
        >
          Qayta urinish
        </button>
      )}
    </div>
  );
}

export function LoadingSkeleton({ className = "h-24 w-full" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg border-2 border-border bg-muted ${className}`} />;
}

export function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-1">
      <div>
        {eyebrow && <p className="label-eyebrow">{eyebrow}</p>}
        <h2 className="text-lg font-extrabold tracking-tight text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}
