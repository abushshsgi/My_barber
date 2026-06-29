import { Link } from "@tanstack/react-router";
import {
  LAYOUT_LABELS,
  type SalonDesktopLayoutId,
} from "@/components/desktop/pages/salon-layouts/types";
import { cn } from "@/lib/utils";

export function SalonLayoutSwitcher({
  salonId,
  activeLayout,
}: {
  salonId: string;
  activeLayout: SalonDesktopLayoutId;
}) {
  const layouts = [1, 2, 3, 4, 5] as const;

  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-2">
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Desktop layout
      </p>
      <div className="flex flex-wrap gap-1.5">
        {layouts.map((id) => (
          <Link
            key={id}
            to="/salon/$id"
            params={{ id: salonId }}
            search={{ layout: id }}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
              activeLayout === id
                ? "bg-foreground text-background"
                : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {id}. {LAYOUT_LABELS[id]}
          </Link>
        ))}
      </div>
    </div>
  );
}
