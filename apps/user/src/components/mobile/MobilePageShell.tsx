import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { MOBILE_CONTENT_PADDING_CLASS } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  right?: ReactNode;
  backTo?: string;
  /** To'liq ekran — panel va yon chegaralar yo'q, scroll ichkarida. */
  flush?: boolean;
};

/** Mobil sahifa shell — panel yoki to'liq ekran variant. */
export function MobilePageShell({
  title,
  subtitle,
  children,
  className,
  right,
  backTo = "/profile",
  flush = false,
}: Props) {
  if (flush) {
    return (
      <div
        className={cn(
          "flex min-h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom,0px))] flex-col lg:min-h-full",
          className,
        )}
      >
        <header className="shrink-0 border-b border-border bg-background px-4 pb-3 pt-safe">
          <div className="flex items-center gap-3">
            <Link
              to={backTo}
              className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-surface active:scale-95"
              aria-label="Orqaga"
            >
              <ChevronLeft className="size-5" strokeWidth={2.25} />
            </Link>
            <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">{title}</h1>
            {right ? <div className="shrink-0">{right}</div> : null}
          </div>
          {subtitle ? <p className="mt-2 pl-[52px] text-xs text-muted-foreground">{subtitle}</p> : null}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-full", MOBILE_CONTENT_PADDING_CLASS, className)}>
      <div className="px-4 pb-4 pt-safe">
        <div className="flex items-start gap-3">
          <Link
            to={backTo}
            className="neo-pill mt-0.5 grid h-11 w-11 shrink-0 place-items-center"
            aria-label="Orqaga"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
          </Link>
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight">{title}</h1>
            {subtitle ? <p className="mt-1 text-xs font-semibold text-muted-foreground">{subtitle}</p> : null}
          </div>
          {right}
        </div>
      </div>
      <div className="page-stagger mx-3 mb-3 rounded-2xl neo-panel px-4 pb-6 pt-5">{children}</div>
    </div>
  );
}
