import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ClientOnly } from "@/components/ClientOnly";
import { DesktopLayout } from "@/components/desktop/DesktopLayout";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { ScrollToTopIndicator } from "@/components/ui/ScrollToTopIndicator";
import { useIsLgUp } from "@/hooks/use-mobile";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { shouldShowScrollToTop } from "@/lib/scroll-to-top";

const MOBILE_VIEWPORT_LOCK_PREFIXES = ["/map", "/ai-style", "/stories/"];

function shouldLockMobileViewport(pathname: string): boolean {
  return MOBILE_VIEWPORT_LOCK_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

/** Eski route’lardan qolgan `overflow: hidden` ni tozalash. */
function useReleaseStuckDocumentScroll(pathname: string, isLgUp: boolean) {
  useEffect(() => {
    if (!shouldLockMobileViewport(pathname) || isLgUp) {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
  }, [pathname, isLgUp]);
}

export function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { chatUnread, notificationsUnread } = useNavBadges();
  const isLgUp = useIsLgUp();
  const isAuth = pathname === "/auth";
  const showScrollTop = shouldShowScrollToTop(pathname);

  useReleaseStuckDocumentScroll(pathname, isLgUp);

  if (isAuth) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  const scrollTop = showScrollTop ? (
    <ClientOnly>
      <ScrollToTopIndicator />
    </ClientOnly>
  ) : null;

  if (isLgUp) {
    return (
      <DesktopLayout chatUnread={chatUnread} notificationsUnread={notificationsUnread}>
        {children}
        {scrollTop}
      </DesktopLayout>
    );
  }

  return (
    <MobileLayout unreadCount={chatUnread}>
      {children}
      {scrollTop}
    </MobileLayout>
  );
}
