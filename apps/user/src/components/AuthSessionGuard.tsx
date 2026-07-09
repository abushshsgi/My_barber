import { useEffect, type ReactNode } from "react";
import { refreshAiStyleHistoryCache } from "@/lib/api/ai";
import { bootstrapUserSession, handleAuthFailure, hasValidUserSession } from "@/lib/api/client";
import { getActiveUserId, prepareFaceProfileStorageForUser } from "@/lib/face-profile";
import { useNotificationsWebSocket } from "@/hooks/use-notifications-websocket";
import { clearQueryClientCache } from "@/lib/query-client";
import { prepareUserPrefsStorageForUser } from "@/lib/user-prefs";

const AUTH_PATH = "/auth";
const TOKEN_KEY = "mybarber_user_access";
const USER_KEY = "mysaloon.auth.user";

function isAuthRoute(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return path === AUTH_PATH || path.startsWith(`${AUTH_PATH}/`);
}

function NotificationsRealtimeBridge() {
  useNotificationsWebSocket();
  return null;
}

/** Tab qayta ochilganda refresh token orqali sessiyani tiklash. */
export function AuthSessionGuard({ children }: { children: ReactNode }) {
  useEffect(() => {
    const verify = () => {
      if (isAuthRoute()) return;
      void bootstrapUserSession().then((ok) => {
        if (!ok && !hasValidUserSession()) return;
        if (!ok) return;
        const uid = getActiveUserId();
        if (uid) {
          prepareFaceProfileStorageForUser(uid, { allowLegacyClaim: true });
          prepareUserPrefsStorageForUser(uid, { allowLegacyClaim: true });
          void refreshAiStyleHistoryCache();
        }
      });
    };

    verify();
    window.addEventListener("focus", verify);
    document.addEventListener("visibilitychange", verify);
    return () => {
      window.removeEventListener("focus", verify);
      document.removeEventListener("visibilitychange", verify);
    };
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== TOKEN_KEY && e.key !== USER_KEY) return;
      if (!e.newValue && e.oldValue) {
        handleAuthFailure();
        return;
      }
      if (e.newValue !== e.oldValue) {
        clearQueryClientCache();
        window.location.reload();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <>
      <NotificationsRealtimeBridge />
      {children}
    </>
  );
}
