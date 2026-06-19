import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  expanded: boolean;
  className?: string;
};

export function MapDesktopMapFrame({ children, expanded, className }: Props) {
  const inner = (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-background">
      <div className="absolute inset-0">{children}</div>
    </div>
  );

  if (expanded && typeof document !== "undefined") {
    return createPortal(
      <div className={cn("fixed inset-0 z-[70] h-[100dvh] w-screen bg-background", className)}>
        {inner}
      </div>,
      document.body,
    );
  }

  return <div className={cn("relative min-h-0 min-w-0 flex-1", className)}>{inner}</div>;
}
