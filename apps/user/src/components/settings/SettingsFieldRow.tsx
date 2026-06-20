import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value?: React.ReactNode;
  emptyLabel?: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionTo?: string;
  trailing?: React.ReactNode;
  expanded?: boolean;
  children?: React.ReactNode;
};

export function SettingsFieldRow({
  label,
  value,
  emptyLabel,
  hint,
  actionLabel,
  onAction,
  actionTo,
  trailing,
  expanded,
  children,
}: Props) {
  const displayValue = value ?? (
    <span className="text-muted-foreground">{emptyLabel ?? "—"}</span>
  );

  const actionClass =
    "shrink-0 text-sm font-semibold text-foreground underline underline-offset-2 transition-opacity hover:opacity-70";

  return (
    <div className={cn("border-b border-border py-6 last:border-b-0", expanded && "pb-4")}>
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-foreground">{label}</p>
          <div className="mt-1 text-sm text-muted-foreground">{displayValue}</div>
          {hint ? <p className="mt-2 max-w-lg text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
        </div>
        {trailing}
        {!trailing && actionLabel && actionTo ? (
          <Link to={actionTo} className={actionClass}>
            {actionLabel}
          </Link>
        ) : !trailing && actionLabel && onAction ? (
          <button type="button" onClick={onAction} className={actionClass}>
            {actionLabel}
          </button>
        ) : null}
      </div>
      {expanded && children ? <div className="mt-4 max-w-md">{children}</div> : null}
    </div>
  );
}
