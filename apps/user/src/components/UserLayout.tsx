import { useRouterState } from "@tanstack/react-router";
import { UserBottomNav } from "./UserBottomNav";
import { DesktopSidebar } from "./DesktopSidebar";
import { DesktopTopBar } from "./layout/DesktopTopBar";
import { SiteFooter } from "./SiteFooter";
import { useNavBadges } from "@/hooks/use-nav-badges";
import {
  getDesktopContentProfile,
  getDesktopMaxWidthClass,
  showsSiteFooter,
} from "@/lib/layout-routes";
import { DESKTOP_SIDEBAR_LEFT_CLASS, DESKTOP_SIDEBAR_OFFSET_CLASS } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

const FULL_BLEED_EXACT = ["/auth", "/ai-style"];
const FULL_BLEED_PREFIX = ["/map", "/stories/"];

export function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { chatUnread, notificationsUnread } = useNavBadges();
  const isAuth = pathname === "/auth";
  const isAiStyle = pathname === "/ai-style";
  const isMap = pathname === "/map";
  const isFullBleed =
    isAuth ||
    isAiStyle ||
    isMap ||
    FULL_BLEED_PREFIX.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isViewportLocked = isAiStyle || isMap;
  const showFooter = showsSiteFooter(pathname);
  const contentProfile = getDesktopContentProfile(pathname);
  const maxWidthClass = getDesktopMaxWidthClass(contentProfile);
  const showTopBar = !isAuth && !isMap && !isAiStyle && !pathname.startsWith("/stories/");

  if (isAuth) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DesktopSidebar chatUnread={chatUnread} notificationsUnread={notificationsUnread} />
      <main className={cn("flex min-h-screen flex-col", DESKTOP_SIDEBAR_OFFSET_CLASS)}>
        {showTopBar ? <DesktopTopBar /> : null}
        <div
          className={cn(
            "mx-auto w-full max-w-[480px] flex-1 lg:max-w-[720px]",
            maxWidthClass,
            isMap &&
              cn(
                "fixed inset-x-0 top-0 bottom-[calc(68px+env(safe-area-inset-bottom,0px))] z-10 max-w-none flex-none overflow-hidden overscroll-none lg:inset-y-0 lg:right-0 lg:bottom-0 lg:mx-0 lg:h-[100dvh] lg:max-w-none",
                DESKTOP_SIDEBAR_LEFT_CLASS,
                showTopBar && "lg:top-14",
              ),
            isViewportLocked &&
              !isMap &&
              "fixed inset-x-0 top-0 z-10 overflow-hidden overscroll-none lg:static lg:z-auto lg:h-[100dvh]",
            isAiStyle && cn("h-[100dvh] bottom-0 lg:right-0", DESKTOP_SIDEBAR_LEFT_CLASS),
            isFullBleed && !isViewportLocked && "pb-0 lg:pb-12",
            !isFullBleed &&
              "pb-[calc(68px+env(safe-area-inset-bottom)+16px)] lg:pb-12",
          )}
        >
          {children}
        </div>
        {showFooter ? <SiteFooter /> : null}
      </main>
      <UserBottomNav unreadCount={chatUnread} />
    </div>
  );
}
