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
          ? "neo-page relative min-h-screen w-full max-w-none"
          : "neo-page texture-grid relative mx-auto min-h-screen w-full max-w-md pb-32"
      }
    >
      <UserPreferencesInit />
      {!isAuthRoute ? <PwaInstallHint /> : null}
      {children}
      {!isAuthRoute ? <UserBottomNav /> : null}
    </div>
  );
}
