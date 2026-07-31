import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouterState } from "@tanstack/react-router";
import { getMobileBottomInset } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** Default: side-by-side. Use `stack` for full-width stacked CTAs (long labels). */
  layout?: "row" | "stack";
};

/** Booking/checkout uchun pastki sticky action bar — floating dock ustida. */
export function MobileStickyActionBar({ children, className, layout = "row" }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const bottomInset = getMobileBottomInset(pathname);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-x-0 z-[45] border-t border-border bg-background/95 backdrop-blur-xl lg:hidden",
        className,
      )}
      style={{ bottom: bottomInset }}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-lg px-4 py-2.5",
          layout === "stack" ? "flex flex-col gap-2" : "flex items-stretch gap-2",
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
