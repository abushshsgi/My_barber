import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  maxWidthClass?: string;
  className?: string;
};

/** Mobil va desktop: pastda fixed action panel. */
export function BookingFlowActionRail({ children, maxWidthClass = "max-w-lg", className }: Props) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur-sm",
        className,
      )}
    >
      <div className={cn("mx-auto flex items-stretch gap-2 px-4 lg:px-10", maxWidthClass)}>{children}</div>
    </div>
  );
}

export function BookingFlowExitLink({ className }: { maxWidthClass?: string; className?: string }) {
  return (
    <Link
      to="/barber/bookings"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg px-2.5 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      Chiqish
    </Link>
  );
}
