import { useRouter, useRouterState } from "@tanstack/react-router";
import { shouldShowMobileDock } from "@/lib/layout-routes";
import { navigateBack } from "@/lib/mobile-back";
import { cn } from "@/lib/utils";
import { MobileBackButton } from "@/components/mobile/MobileBackButton";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
  /** Header ostida, sticky header ichida qoladigan qo'shimcha blok (masalan tablar). */
  headerExtra?: React.ReactNode;
  /** Tarix bo'sh bo'lsa shu sahifaga qaytadi. */
  backTo?: string;
  /** true bo'lsa doim backTo ga o'tadi (activity hub oqimi). */
  strictBack?: boolean;
  /** To'liq ekran — panel yo'q; document scroll + sticky header. */
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

  const backButton = (
    <MobileBackButton onClick={() => navigateBack(router, backTo, strictBack)} />
  );

  const titleBlock = (
    <div className="min-w-0 flex-1 pt-0.5">
      <h1
        className={cn(
          "truncate font-bold tracking-tight",
          flush ? "text-base" : "text-lg font-bold leading-tight",
        )}
      >
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );

  if (flush) {
    return (
      <div className={cn("min-h-full min-w-0", className)}>
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 px-4 pb-3 pt-safe backdrop-blur-md">
          <div className="flex items-start gap-3">
            {backButton}
            {titleBlock}
            {right ? <div className="shrink-0">{right}</div> : null}
          </div>
          {headerExtra}
        </header>
        <div
          className={cn(
            "min-w-0",
            /* UserLayout dock padding qiladi; dock yo'q sahifalarda pastki safe-area. */
            !showDock && "pb-[max(1rem,env(safe-area-inset-bottom,0px))]",
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-full min-w-0", className)}>
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 px-4 pb-2.5 pt-safe backdrop-blur-md">
        <div className="flex items-start gap-3">
          {backButton}
          {titleBlock}
          {right}
        </div>
        {headerExtra}
      </header>
      <div className="page-stagger min-w-0 px-4 pb-4 pt-3">{children}</div>
    </div>
  );
}
