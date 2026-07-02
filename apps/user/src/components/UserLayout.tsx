import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ClientOnly } from "@/components/ClientOnly";
import { DesktopAppHeader } from "@/components/desktop/shell/DesktopShellParts";
import { SiteFooter } from "@/components/SiteFooter";
import { UserBottomNav } from "@/components/UserBottomNav";
import { ScrollToTopIndicator } from "@/components/ui/ScrollToTopIndicator";
import { useLayoutRouteFlags } from "@/hooks/use-layout-route-flags";
import { useNavBadges } from "@/hooks/use-nav-badges";
import {
  DESKTOP_BAZAAR_INSET,
  DESKTOP_HOME_INSET,
  DESKTOP_SHELL_INSET,
} from "@/lib/desktop-bazaar-layout";
import { shouldShowScrollToTop } from "@/lib/scroll-to-top";
import { cn } from "@/lib/utils";

const MOBILE_VIEWPORT_LOCK_PREFIXES = ["/map", "/ai-style", "/stories/"];

function shouldLockMobileViewport(pathname: string): boolean {
  return MOBILE_VIEWPORT_LOCK_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

/** Eski route'lardan qolgan `overflow: hidden` ni tozalash. */
function useReleaseStuckDocumentScroll(pathname: string) {
  useEffect(() => {
    const releaseIfNeeded = () => {
      const isLgUp = window.matchMedia("(min-width: 1024px)").matches;
      if (!shouldLockMobileViewport(pathname) || isLgUp) {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      }
    };
    releaseIfNeeded();
    const mql = window.matchMedia("(min-width: 1024px)");
    mql.addEventListener("change", releaseIfNeeded);
    return () => mql.removeEventListener("change", releaseIfNeeded);
  }, [pathname]);
}

export function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { chatUnread, notificationsUnread } = useNavBadges();
  const flags = useLayoutRouteFlags(pathname);
  const isAuth = pathname === "/auth";
  const showScrollTop = shouldShowScrollToTop(pathname);

  useReleaseStuckDocumentScroll(pathname);

  if (isAuth) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  const scrollTop = showScrollTop ? (
    <ClientOnly>
      <ScrollToTopIndicator />
    </ClientOnly>
  ) : null;

  const footerInset = flags.bazaarInset
    ? flags.isHome
      ? DESKTOP_HOME_INSET
      : DESKTOP_BAZAAR_INSET
    : undefined;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="hidden lg:block">
        <DesktopAppHeader
          chatUnread={chatUnread}
          notificationsUnread={notificationsUnread}
          headerInsetClassName={DESKTOP_SHELL_INSET}
        />
      </div>

      <main className={cn("flex min-h-screen flex-col", flags.isFullBleed && "lg:min-h-0 lg:flex-1")}>
        <div
          className={cn(
            "mx-auto flex w-full max-w-[480px] flex-1 flex-col",
            flags.isMap &&
              "fixed inset-x-0 top-0 bottom-[calc(68px+env(safe-area-inset-bottom,0px))] z-10 max-w-none flex-none overflow-hidden overscroll-none lg:static lg:inset-auto lg:z-auto lg:h-[calc(100dvh-4.25rem)] lg:max-w-none lg:overflow-hidden",
            flags.isViewportLocked &&
              !flags.isMap &&
              "fixed inset-x-0 top-0 z-10 h-[100dvh] overflow-hidden overscroll-none lg:static lg:z-auto lg:h-auto lg:overflow-visible",
            flags.isAiStyle && "h-[100dvh] lg:h-[calc(100dvh-4.25rem)]",
            flags.isFullBleed && !flags.isViewportLocked && "pb-0",
            !flags.isFullBleed && "pb-[calc(68px+env(safe-area-inset-bottom)+16px)] lg:pb-12",
            "lg:mx-0 lg:max-w-none lg:pt-6",
            !flags.isFullBleed && !flags.bazaarInset && DESKTOP_SHELL_INSET,
            flags.bazaarInset && "lg:px-0",
          )}
        >
          {flags.isFullBleed ? (
            <div
              className={cn(
                (flags.isMap || flags.isAiStyle) &&
                  "flex min-h-0 flex-1 flex-col overflow-hidden lg:h-full",
              )}
            >
              {children}
            </div>
          ) : (
            children
          )}
          {flags.showFooter ? (
            <>
              <SiteFooter insetClassName="px-5 sm:px-6 lg:hidden" className="mt-8 pb-2" />
              <SiteFooter insetClassName={footerInset} className="mt-8 hidden lg:block" />
            </>
          ) : null}
        </div>
      </main>

      <div className="lg:hidden">
        <UserBottomNav unreadCount={chatUnread} />
      </div>

      {scrollTop}
    </div>
  );
}
