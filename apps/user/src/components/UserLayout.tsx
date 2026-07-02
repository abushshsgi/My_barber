import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ClientOnly } from "@/components/ClientOnly";
import { DesktopLayout } from "@/components/desktop/DesktopLayout";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { ScrollToTopIndicator } from "@/components/ui/ScrollToTopIndicator";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { shouldShowScrollToTop } from "@/lib/scroll-to-top";

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

  return (
    <>
      <div className="lg:hidden">
        <MobileLayout unreadCount={chatUnread}>
          {children}
          {scrollTop}
        </MobileLayout>
      </div>
      <div className="hidden lg:block">
        <DesktopLayout chatUnread={chatUnread} notificationsUnread={notificationsUnread}>
          {children}
          {scrollTop}
        </DesktopLayout>
      </div>
    </>
  );
}
