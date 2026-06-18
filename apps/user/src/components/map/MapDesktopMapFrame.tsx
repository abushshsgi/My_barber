import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  expanded: boolean;
  className?: string;
};

export function MapDesktopMapFrame({ children, expanded, className }: Props) {
  return (
    <div
      className={cn(
        "relative flex min-h-0 min-w-0 flex-1 flex-col",
        expanded ? "fixed inset-0 z-[70] bg-background" : "h-full w-full",
        className,
      )}
    >
      <div className="relative isolate z-0 h-full min-h-0 w-full flex-1 overflow-hidden bg-background">
        <div className="absolute inset-0 z-0">{children}</div>
      </div>
    </div>
  );
}
