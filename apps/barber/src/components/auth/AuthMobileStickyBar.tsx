import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
};

/** CreateSalonPage bilan bir xil — mobile pastki action bar. */
export function AuthMobileStickyBar({ children, className }: Props) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden",
        className,
      )}
    >
      <div className="mx-auto flex max-w-[920px] items-center gap-2 px-3.5 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}
