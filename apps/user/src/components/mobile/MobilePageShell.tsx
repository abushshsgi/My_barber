import { useRouter, useRouterState } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { getMobileContentPaddingClass } from "@/lib/layout-constants";
import { navigateBack } from "@/lib/mobile-back";
import { shouldShowMobileDock } from "@/lib/layout-routes";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
  /** Tarix bo'sh bo'lsa shu sahifaga qaytadi. */
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
  backTo = "/",
  flush = false,
}: Props) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showDock = shouldShowMobileDock(pathname);
  const contentPadding = getMobileContentPaddingClass(pathname);

  const backButtonClass = flush
    ? "grid size-10 shrink-0 place-items-center rounded-full border border-border bg-surface active:scale-95"
    : "neo-pill mt-0.5 grid h-11 w-11 shrink-0 place-items-center";

  const backButton = (
    <button
      type="button"
      onClick={() => navigateBack(router, backTo)}
      className={backButtonClass}
      aria-label="Orqaga"
    >
      <ChevronLeft className={flush ? "size-5" : "h-5 w-5"} strokeWidth={flush ? 2.25 : 2.4} />
    </button>
  );

  if (flush) {
    return (
      <div
        className={cn(
          "flex flex-col lg:min-h-full",
          showDock ? "min-h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom,0px))]" : "min-h-dvh",
          className,
        )}
      >
        <header className="shrink-0 border-b border-border bg-background px-4 pb-3 pt-safe">
          <div className="flex items-center gap-3">
            {backButton}
            <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">{title}</h1>
            {right ? <div className="shrink-0">{right}</div> : null}
          </div>
          {subtitle ? (
            <p className="mt-2 pl-[52px] text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-full", contentPadding, className)}>
      <div className="px-4 pb-4 pt-safe">
        <div className="flex items-start gap-3">
          {backButton}
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-xs font-semibold text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {right}
        </div>
      </div>
      <div className="page-stagger mx-3 mb-3 rounded-2xl neo-panel px-4 pb-6 pt-5">{children}</div>
    </div>
  );
}
