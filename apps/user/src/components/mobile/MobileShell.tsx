import type { ReactNode } from "react";
import { MobileDockNav } from "@/components/mobile/MobileDockNav";
import { MOBILE_CONTENT_PADDING_CLASS } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  unreadCount?: number;
  className?: string;
  /** Map / AI kabi full-bleed sahifalar — pastki padding yo'q. */
  noContentPadding?: boolean;
  /** Viewport lock (map, stories) — fixed layout. */
  viewportLocked?: boolean;
  isMap?: boolean;
};

/** Mobil-only neo shell — `lg:hidden` ichida ishlatiladi. */
export function MobileShell({
  children,
  unreadCount = 0,
  className,
  noContentPadding = false,
  viewportLocked = false,
  isMap = false,
}: Props) {
  return (
    <div className={cn("mobile-neo neo-page texture-grid lg:hidden", className)}>
      <div
        className={cn(
          "mx-auto flex w-full max-w-md flex-1 flex-col",
          isMap &&
            "fixed inset-x-0 top-0 z-10 max-w-none flex-none overflow-hidden overscroll-none",
          isMap && "bottom-[var(--mobile-dock-offset)]",
          viewportLocked && !isMap && "fixed inset-x-0 top-0 z-10 h-[100dvh] overflow-hidden overscroll-none",
          !noContentPadding && !viewportLocked && MOBILE_CONTENT_PADDING_CLASS,
        )}
        style={
          isMap
            ? ({ "--mobile-dock-offset": "calc(3.5rem + env(safe-area-inset-bottom, 0px))" } as React.CSSProperties)
            : undefined
        }
      >
        {children}
      </div>
      <MobileDockNav unreadCount={unreadCount} />
    </div>
  );
}
