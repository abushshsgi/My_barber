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
  const isFullBleed =
    isAuth ||
    isAiStyle ||
    FULL_BLEED_PREFIX.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

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
            isFullBleed
              ? "pb-0 lg:pb-12"
              : "pb-[calc(68px+env(safe-area-inset-bottom)+16px)] lg:pb-12",
            isAiStyle && "h-[100dvh] overflow-hidden",
          )}
        >
          {children}
        </div>
      </main>
      <UserBottomNav />
    </div>
  );
}
