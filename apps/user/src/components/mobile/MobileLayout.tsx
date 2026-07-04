import { useRouterState } from "@tanstack/react-router";
import { UserBottomNav } from "@/components/UserBottomNav";
import { cn } from "@/lib/utils";

const FULL_BLEED_PREFIX = ["/map", "/stories/"];

type Props = {
  children: React.ReactNode;
  unreadCount?: number;
};

export function MobileLayout({ children, unreadCount = 0 }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAiStyle = pathname === "/ai-style";
  const isMap = pathname === "/map";
  const isFullBleed =
    isAiStyle ||
    isMap ||
    FULL_BLEED_PREFIX.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isViewportLocked = isAiStyle || isMap;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="flex min-h-screen flex-col">
        <div
          className={cn(
            "mx-auto w-full max-w-[480px] flex-1",
            isMap &&
              "fixed inset-x-0 top-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] z-10 max-w-none flex-none overflow-hidden overscroll-none",
            isViewportLocked &&
              !isMap &&
              "fixed inset-x-0 top-0 z-10 h-[100dvh] overflow-hidden overscroll-none",
            isAiStyle && "h-[100dvh]",
            isFullBleed && !isViewportLocked && "pb-0",
            !isFullBleed && "pb-[calc(3.5rem+env(safe-area-inset-bottom))]",
          )}
        >
          {children}
        </div>
      </main>
      <UserBottomNav unreadCount={unreadCount} />
    </div>
  );
}
