import { useRouterState } from "@tanstack/react-router";
import { UserBottomNav } from "./UserBottomNav";
import { DesktopSidebar } from "./DesktopSidebar";
import { cn } from "@/lib/utils";

const FULL_BLEED_EXACT = ["/auth", "/ai-style"];
const FULL_BLEED_PREFIX = ["/map", "/stories/"];

export function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuth = pathname === "/auth";
  const isAiStyle = pathname === "/ai-style";
  const isMap = pathname === "/map";
  const isFullBleed =
    isAuth ||
    isAiStyle ||
    isMap ||
    FULL_BLEED_PREFIX.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isViewportLocked = isAiStyle || isMap;

  if (isAuth) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DesktopSidebar />
      <main className="lg:pl-[240px]">
        <div
          className={cn(
            "mx-auto w-full max-w-[480px] lg:max-w-[720px]",
            isViewportLocked &&
              "fixed inset-x-0 top-0 z-10 overflow-hidden overscroll-none lg:static lg:z-auto lg:h-[100dvh]",
            isMap &&
              "bottom-[calc(68px+env(safe-area-inset-bottom,0px))] lg:bottom-auto lg:left-[240px] lg:right-0",
            isAiStyle && "h-[100dvh] bottom-0 lg:left-[240px] lg:right-0",
            isFullBleed && !isViewportLocked && "pb-0 lg:pb-12",
            !isFullBleed &&
              "pb-[calc(68px+env(safe-area-inset-bottom)+16px)] lg:pb-12",
          )}
        >
          {children}
        </div>
      </main>
      <UserBottomNav />
    </div>
  );
}
