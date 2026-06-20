import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export type QuickActionItem = {
  icon: LucideIcon;
  label: string;
  to: string;
};

type Props = {
  items: QuickActionItem[];
};

export function ProfileDesktopQuickActions({ items }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(({ icon: Icon, label, to }) => (
        <Link
          key={to + label}
          to={to as never}
          className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4 transition-colors hover:bg-surface/60"
        >
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface">
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <span className="text-sm font-bold leading-tight">{label}</span>
        </Link>
      ))}
    </div>
  );
}
