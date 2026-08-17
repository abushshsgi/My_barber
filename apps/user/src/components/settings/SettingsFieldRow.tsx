import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value?: React.ReactNode;
  emptyLabel?: string;
  hint?: string;
  actionLabel?: string;
  cancelLabel?: string;
  onAction?: () => void;
  actionTo?: string;
  actionSearch?: Record<string, unknown>;
  trailing?: React.ReactNode;
  expanded?: boolean;
  editing?: boolean;
  actionLoading?: boolean;
  children?: React.ReactNode;
};

export function SettingsFieldRow({
  label,
  value,
  emptyLabel,
  hint,
  actionLabel,
  cancelLabel,
  onAction,
  actionTo,
  actionSearch,
  trailing,
  expanded,
  editing,
  actionLoading,
  children,
}: Props) {
  const isEditing = editing ?? expanded;
  const displayValue = value ?? <span className="text-muted-foreground">{emptyLabel ?? "—"}</span>;

  const actionClass =
    "shrink-0 cursor-pointer text-sm font-semibold text-foreground underline underline-offset-2 transition-opacity duration-200 hover:opacity-70 disabled:opacity-40";

  const resolvedActionLabel = isEditing ? (cancelLabel ?? "Bekor") : actionLabel;

  return (
    <div className={cn("border-b border-border py-6 last:border-b-0", isEditing && "pb-4")}>
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-foreground">{label}</p>
          {!isEditing ? (
            <div className="mt-1 text-sm text-muted-foreground">{displayValue}</div>
          ) : null}
          {hint && !isEditing ? (
            <p className="mt-2 max-w-lg text-xs leading-relaxed text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {trailing}
        {!trailing && actionLabel && actionTo && !isEditing ? (
          <Link to={actionTo} search={actionSearch} className={actionClass}>
            {actionLabel}
          </Link>
        ) : !trailing && resolvedActionLabel && onAction ? (
          <button type="button" onClick={onAction} disabled={actionLoading} className={actionClass}>
            {resolvedActionLabel}
          </button>
        ) : null}
      </div>
      {isEditing && hint ? (
        <p className="mt-2 max-w-lg text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
      {isEditing && children ? <div className="mt-4 max-w-md">{children}</div> : null}
    </div>
  );
}

export function SettingsEditActions({
  onSave,
  onCancel,
  saveLabel,
  cancelLabel,
  saving,
  saveDisabled,
}: {
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
  cancelLabel: string;
  saving?: boolean;
  saveDisabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={saveDisabled || saving}
        className="cursor-pointer rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity duration-200 hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "…" : saveLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors duration-200 hover:bg-muted/50 disabled:opacity-60"
      >
        {cancelLabel}
      </button>
    </div>
  );
}
