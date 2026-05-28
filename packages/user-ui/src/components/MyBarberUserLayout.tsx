import { useRouterState } from "@tanstack/react-router";
import { MyBarberUserBottomNav } from "./MyBarberUserBottomNav";
import { NeoPage } from "./NeoPrimitives";

type MyBarberUserLayoutProps = {
  children: React.ReactNode;
  unreadCount?: number;
};

export function MyBarberUserLayout({ children, unreadCount }: MyBarberUserLayoutProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuthRoute = pathname.startsWith("/auth");

  if (isAuthRoute) {
    return (
      <NeoPage className="relative min-h-screen w-full max-w-none">{children}</NeoPage>
    );
  }

  return (
    <NeoPage className="texture-grid relative mx-auto min-h-screen w-full max-w-md pb-32 lg:max-w-none lg:pb-12">
      {children}
      <MyBarberUserBottomNav unreadCount={unreadCount} />
    </NeoPage>
  );
}
