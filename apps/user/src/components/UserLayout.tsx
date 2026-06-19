import { useRouterState } from "@tanstack/react-router";
import { DesktopLayout } from "@/components/desktop/DesktopLayout";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { useNavBadges } from "@/hooks/use-nav-badges";

export function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { chatUnread, notificationsUnread } = useNavBadges();
  const isAuth = pathname === "/auth";

  if (isAuth) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <>
      <div className="lg:hidden">
        <MobileLayout unreadCount={chatUnread}>{children}</MobileLayout>
      </div>
      <div className="hidden lg:block">
        <DesktopLayout chatUnread={chatUnread} notificationsUnread={notificationsUnread}>
          {children}
        </DesktopLayout>
      </div>
    </>
  );
}
