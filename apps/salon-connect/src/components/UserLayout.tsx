import { useRouterState } from "@tanstack/react-router";
import { UserBottomNav } from "./UserBottomNav";
import { DesktopSidebar } from "./DesktopSidebar";

const FULL_BLEED = ["/auth"];

export function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuth = FULL_BLEED.includes(pathname);

  if (isAuth) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DesktopSidebar />
      <main className="lg:pl-[240px]">
        <div className="mx-auto w-full max-w-[480px] pb-[88px] lg:max-w-[720px] lg:pb-12">
          {children}
        </div>
      </main>
      <UserBottomNav />
    </div>
  );
}
