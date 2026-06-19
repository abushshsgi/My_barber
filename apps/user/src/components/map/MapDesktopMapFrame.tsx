import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  controls: ReactNode;
  expanded: boolean;
  className?: string;
};

function MapFrameShell({
  children,
  controls,
  className,
}: {
  children: ReactNode;
  controls: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative h-full min-h-0 w-full", className)}>
      <div className="relative isolate z-0 h-full min-h-0 w-full overflow-hidden bg-background">
        <div className="absolute inset-0">{children}</div>
      </div>
      {controls}
    </div>
  );
}

export function MapDesktopMapFrame({ children, controls, expanded, className }: Props) {
  const shell = (
    <MapFrameShell controls={controls} className={className}>
      {children}
    </MapFrameShell>
  );

  if (expanded && typeof document !== "undefined") {
    return createPortal(
      <div className="fixed inset-0 z-[70] h-[100dvh] w-screen bg-background">{shell}</div>,
      document.body,
    );
  }

  return <div className="relative min-h-0 min-w-0 flex-1">{shell}</div>;
}
