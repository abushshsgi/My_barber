import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  maxWidthClass?: string;
  className?: string;
};

/** Mobil: pastda fixed. Desktop: kontent ichida sticky panel. */
export function BookingFlowActionRail({ children, maxWidthClass = "max-w-lg", className }: Props) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur-sm lg:hidden",
          className,
        )}
      >
        <div className={cn("mx-auto flex items-stretch gap-2 px-4", maxWidthClass)}>{children}</div>
      </div>

      <div className="mt-6 hidden lg:block">
        <div
          className={cn(
            "sticky top-[4.5rem] z-20 rounded-2xl border border-border bg-card/95 p-3 shadow-card backdrop-blur-sm",
            maxWidthClass,
          )}
        >
          <div className="flex items-stretch gap-2">{children}</div>
        </div>
      </div>
    </>
  );
}

export function BookingFlowExitLink({
  maxWidthClass,
  className,
}: {
  maxWidthClass?: string;
  className?: string;
}) {
  return (
    <Link
      to="/barber/bookings"
      className={cn(
        "inline-flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium text-muted-foreground",
        className,
      )}
    >
      Chiqish
    </Link>
  );
}
