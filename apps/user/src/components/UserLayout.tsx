import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { DesktopLayout } from "@/components/desktop/DesktopLayout";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { useIsLgUp } from "@/hooks/use-mobile";
import { useNavBadges } from "@/hooks/use-nav-badges";

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

  useReleaseStuckDocumentScroll(pathname, isLgUp);

  if (isAuth) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  if (isLgUp) {
    return (
      <DesktopLayout chatUnread={chatUnread} notificationsUnread={notificationsUnread}>
        {children}
      </DesktopLayout>
    );
  }

  return <MobileLayout unreadCount={chatUnread}>{children}</MobileLayout>;
}
