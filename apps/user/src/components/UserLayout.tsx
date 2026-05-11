"use client";

import { UserBottomNav } from "./UserBottomNav";
import { usePathname } from "@/navigation";
import { useUserNotificationWs } from "@/hooks/useUserNotificationWs";

export function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useUserNotificationWs();
  const hideBottomNav = pathname.startsWith("/auth");

  return (
    <div className="relative mx-auto min-h-screen w-full max-w-md bg-background pb-28 text-foreground">
      {children}
      {!hideBottomNav ? <UserBottomNav /> : null}
    </div>
  );
}
