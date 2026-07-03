import type { ReactNode } from "react";
import { MOBILE_DOCK_OFFSET } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Booking/checkout uchun pastki sticky action bar — floating dock ustida. */
export function MobileStickyActionBar({ children, className }: Props) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-40 border-t-2 border-border bg-surface/95 backdrop-blur-xl lg:hidden",
        className,
      )}
      style={{ bottom: MOBILE_DOCK_OFFSET }}
    >
      <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}
