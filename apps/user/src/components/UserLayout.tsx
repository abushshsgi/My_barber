"use client";

import { UserBottomNav } from "./UserBottomNav";
import { PwaInstallHint } from "./PwaInstallHint";
import { usePathname } from "@/navigation";
import { useUserNotificationWs } from "@/hooks/useUserNotificationWs";
import { UserPreferencesInit } from "./UserPreferencesInit";

export function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useUserNotificationWs();
  const isAuthRoute = pathname.startsWith("/auth");

  return (
    <div
      className={
        isAuthRoute
          ? "relative min-h-screen w-full max-w-none bg-background"
          : "relative mx-auto min-h-screen w-full max-w-md bg-background pb-28"
      }
    >
      <UserPreferencesInit />
      {!isAuthRoute ? <PwaInstallHint /> : null}
      {children}
      {!isAuthRoute ? <UserBottomNav /> : null}
    </div>
  );
}
