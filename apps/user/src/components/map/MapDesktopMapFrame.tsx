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
        "relative flex min-h-0 min-w-0 flex-col",
        expanded
          ? "fixed inset-y-0 right-0 z-[40] w-full bg-background lg:left-[240px]"
          : "min-w-0 flex-1 bg-surface/30 p-3 xl:p-4",
        className,
      )}
    >
      <div
        className={cn(
          "relative isolate z-0 flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background",
          expanded
            ? "h-full rounded-none"
            : "rounded-[20px] border border-border/70 shadow-[0_10px_40px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]",
        )}
      >
        <div className="absolute inset-0 z-0">{children}</div>
      </div>
    </div>
  );
}
