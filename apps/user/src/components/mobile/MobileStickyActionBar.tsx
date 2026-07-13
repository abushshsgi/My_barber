import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { getMobileBottomInset } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Booking/checkout uchun pastki sticky action bar — floating dock ustida. */
export function MobileStickyActionBar({ children, className }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const bottomInset = getMobileBottomInset(pathname);

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-40 border-t-2 border-border bg-surface/95 backdrop-blur-xl lg:hidden",
        className,
      )}
      style={{ bottom: bottomInset }}
    >
      <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-2.5">
        {children}
      </div>
    </div>
  );
}
