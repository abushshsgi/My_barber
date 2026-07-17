import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ClientOnly } from "@/components/ClientOnly";
import { DemoEnvironmentBanner } from "@/components/DemoEnvironmentBanner";
import { DesktopAppHeader } from "@/components/desktop/shell/DesktopShellParts";
import { MobileDockNav } from "@/components/mobile/MobileDockNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ScrollToTopIndicator } from "@/components/ui/ScrollToTopIndicator";
import { useLayoutRouteFlags } from "@/hooks/use-layout-route-flags";
import { useNavBadges } from "@/hooks/use-nav-badges";
import {
  DESKTOP_BAZAAR_INSET,
  DESKTOP_HOME_INSET,
  DESKTOP_SHELL_INSET,
} from "@/lib/desktop-bazaar-layout";
import { shouldShowMobileDock } from "@/lib/layout-routes";
import { getMobileContentPaddingClass } from "@/lib/layout-constants";
import { shouldShowScrollToTop } from "@/lib/scroll-to-top";
import { cn } from "@/lib/utils";

const MOBILE_VIEWPORT_LOCK_EXACT = new Set(["/map", "/ai-style"]);
const MOBILE_VIEWPORT_LOCK_PREFIXES = ["/stories/"];

function shouldLockMobileViewport(pathname: string): boolean {
  if (MOBILE_VIEWPORT_LOCK_EXACT.has(pathname)) return true;
  return MOBILE_VIEWPORT_LOCK_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

/** Eski route'lardan qolgan `overflow: hidden` ni tozalash (map/AI chiqqanda scroll qotib qolmasin). */
function useReleaseStuckDocumentScroll(pathname: string) {
  useEffect(() => {
    const releaseIfNeeded = () => {
      const isLgUp = window.matchMedia("(min-width: 1024px)").matches;
      const shouldLock = shouldLockMobileViewport(pathname) && !isLgUp;
      if (!shouldLock) {
        document.documentElement.style.removeProperty("overflow");
        document.body.style.removeProperty("overflow");
        document.documentElement.style.removeProperty("touch-action");
        document.body.style.removeProperty("touch-action");
        document.documentElement.style.removeProperty("overscroll-behavior");
        document.body.style.removeProperty("overscroll-behavior");
      }
    };
    releaseIfNeeded();
    // Router o'tishidan keyin bfcache/late layout uchun qayta tekshiruv.
    const t = window.setTimeout(releaseIfNeeded, 0);
    const mql = window.matchMedia("(min-width: 1024px)");
    mql.addEventListener("change", releaseIfNeeded);
    return () => {
      window.clearTimeout(t);
      mql.removeEventListener("change", releaseIfNeeded);
    };
  }, [pathname]);
}

export function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { chatUnread, notificationsUnread } = useNavBadges();
  const flags = useLayoutRouteFlags(pathname);
  const showMobileDock = shouldShowMobileDock(pathname);
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
    <div className="min-h-screen min-w-0 overflow-x-clip bg-background text-foreground">
      <ClientOnly>
        <DemoEnvironmentBanner />
      </ClientOnly>
      <div className="hidden lg:block">
        <DesktopAppHeader
          chatUnread={chatUnread}
          notificationsUnread={notificationsUnread}
          headerInsetClassName={DESKTOP_SHELL_INSET}
        />
      </div>

      <main
        className={cn(
          "flex min-h-screen min-w-0 flex-col overflow-x-clip",
          flags.isFullBleed && "lg:min-h-0 lg:flex-1",
        )}
      >
        <div
          className={cn(
            "mobile-neo neo-page texture-grid mx-auto flex w-full min-w-0 flex-1 flex-col overflow-x-clip",
            showMobileDock || pathname === "/onboarding" ? "max-w-none" : "max-w-md",
            pathname === "/onboarding" && "lg:pt-3",
            flags.isMap &&
              "fixed inset-x-0 top-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] z-10 max-w-none flex-none overflow-hidden overscroll-none lg:static lg:inset-auto lg:z-auto lg:h-[calc(100dvh-4.5rem)] lg:max-w-none lg:overflow-hidden",
            flags.isViewportLocked &&
              !flags.isMap &&
              "fixed inset-x-0 top-0 z-10 h-[100dvh] overflow-hidden overscroll-none lg:static lg:z-auto lg:h-auto lg:overflow-visible",
            flags.isAiStyle &&
              "h-[100dvh] max-h-[100dvh] lg:h-[calc(100dvh-4.5rem)] lg:max-h-[calc(100dvh-4.5rem)]",
            flags.isFullBleed && !flags.isViewportLocked && "pb-0",
            !flags.isFullBleed && getMobileContentPaddingClass(pathname),
            !flags.isFullBleed && "lg:pb-12",
            flags.isHome ? "lg:pt-3" : "lg:pt-6",
            !flags.isFullBleed && !flags.bazaarInset && !flags.isMobileFlush && DESKTOP_SHELL_INSET,
            flags.isMobileFlush && "px-0 lg:px-10",
            flags.bazaarInset && "lg:px-0",
            "lg:mx-0 lg:max-w-none",
          )}
        >
          {flags.isFullBleed ? (
            <div
              className={cn(
                (flags.isMap || flags.isAiStyle) &&
                  "flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:h-full",
              )}
            >
              {children}
            </div>
          ) : (
            children
          )}
          {flags.showFooter ? (
            <SiteFooter
              insetClassName={footerInset}
              className={cn(
                "hidden lg:block",
                flags.isHome
                  ? "mt-24 border-t border-border/50 pt-14 lg:mt-36 lg:pt-20"
                  : flags.isSalonPage
                    ? "mt-20 border-t border-border/50 pt-12 lg:mt-28 lg:pt-16"
                    : "mt-14 border-t border-border/40 pt-10 lg:mt-24 lg:pt-14",
              )}
            />
          ) : null}
        </div>
      </main>

      <div className="lg:hidden">
        {showMobileDock ? <MobileDockNav unreadCount={chatUnread} /> : null}
      </div>

      {scrollTop}
    </div>
  );
}
