import { useRouter, useRouterState } from "@tanstack/react-router";
import { getMobileContentPaddingClass } from "@/lib/layout-constants";
import { navigateBack } from "@/lib/mobile-back";
import { shouldShowMobileDock } from "@/lib/layout-routes";
import { cn } from "@/lib/utils";
import { MobileBackButton } from "@/components/mobile/MobileBackButton";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
  /** Header ostida, scrolldan tashqarida qoladigan qo'shimcha blok (masalan tablar). */
  headerExtra?: React.ReactNode;
  /** Tarix bo'sh bo'lsa shu sahifaga qaytadi. */
  backTo?: string;
  /** true bo'lsa doim backTo ga o'tadi (activity hub oqimi). */
  strictBack?: boolean;
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
  headerExtra,
  backTo = "/",
  strictBack = false,
  flush = false,
}: Props) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showDock = shouldShowMobileDock(pathname);
  const contentPadding = getMobileContentPaddingClass(pathname);

  const backButton = (
    <MobileBackButton onClick={() => navigateBack(router, backTo, strictBack)} />
  );

  const titleBlock = (
    <div className="min-w-0 flex-1 pt-0.5">
      <h1
        className={cn(
          "truncate font-bold tracking-tight",
          flush ? "text-lg" : "text-2xl font-extrabold leading-tight",
        )}
      >
        {title}
      </h1>
      {subtitle ? (
        <p className={cn("mt-1 text-xs text-muted-foreground", !flush && "font-semibold")}>{subtitle}</p>
      ) : null}
    </div>
  );

  if (flush) {
    return (
      <div
        className={cn(
          "flex flex-col overflow-hidden lg:min-h-full",
          showDock
            ? "h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom,0px))]"
            : "h-dvh",
          className,
        )}
      >
        <header className="shrink-0 border-b border-border bg-background px-4 pb-3 pt-safe">
          <div className="flex items-start gap-3">
            {backButton}
            {titleBlock}
            {right ? <div className="shrink-0">{right}</div> : null}
          </div>
          {headerExtra}
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
          {titleBlock}
          {right}
        </div>
      </div>
      <div className="page-stagger mx-3 mb-3 rounded-2xl neo-panel px-4 pb-6 pt-5">{children}</div>
    </div>
  );
}
