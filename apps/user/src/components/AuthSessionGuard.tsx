import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { refreshAiStyleHistoryCache } from "@/lib/api/ai";
import { bootstrapUserSession, handleAuthFailure, hasValidUserSession } from "@/lib/api/client";
import { guestMustLogin } from "@/lib/auth-routes";
import { getActiveUserId, prepareFaceProfileStorageForUser } from "@/lib/face-profile";
import { useNotificationsWebSocket } from "@/hooks/use-notifications-websocket";
import { registerPushNotifications } from "@/lib/native-push";
import { clearQueryClientCache } from "@/lib/query-client";
import { buildAuthReturnPath } from "@/lib/require-auth";
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

/** Tab qayta ochilganda refresh token orqali sessiyani tiklash. Login bo'lmasa himoyalangan sahifani yopadi. */
export function AuthSessionGuard({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const redirectStarted = useRef(false);

  const sendToLogin = useCallback(() => {
    if (redirectStarted.current || typeof window === "undefined") return;
    const path = window.location.pathname;
    if (!guestMustLogin(path, hasValidUserSession())) return;
    redirectStarted.current = true;
    const redirectTo = buildAuthReturnPath(path, window.location.search, window.location.hash);
    void navigate({
      to: "/auth",
      search: redirectTo ? { redirect: redirectTo } : {},
      replace: true,
    }).catch(() => {
      redirectStarted.current = false;
    });
  }, [navigate]);

  useEffect(() => {
    if (!guestMustLogin(pathname, false)) redirectStarted.current = false;
  }, [pathname]);

  useEffect(() => {
    if (!guestMustLogin(pathname, hasValidUserSession())) return;
    let cancelled = false;
    void bootstrapUserSession().then((ok) => {
      if (cancelled || ok || hasValidUserSession()) return;
      sendToLogin();
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, sendToLogin]);

  useEffect(() => {
    const verify = (refreshHistory: boolean) => {
      if (isAuthRoute()) return;
      void bootstrapUserSession().then((ok) => {
        if (!ok && !hasValidUserSession()) {
          sendToLogin();
          return;
        }
        if (!ok) return;
        const uid = getActiveUserId();
        if (uid) {
          prepareFaceProfileStorageForUser(uid, { allowLegacyClaim: true });
          prepareUserPrefsStorageForUser(uid, { allowLegacyClaim: true });
          if (refreshHistory) void refreshAiStyleHistoryCache();
        }
        window.dispatchEvent(new CustomEvent("mysaloon:auth-ready"));
        void registerPushNotifications();
      });
    };

    verify(true);
    const onFocus = () => verify(false);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("mysaloon:app-foreground", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("mysaloon:app-foreground", onFocus);
    };
  }, [sendToLogin]);

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

  if (guestMustLogin(pathname, hasValidUserSession())) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
        <p className="text-sm font-medium text-muted-foreground">
          {t("common.loading", { defaultValue: "Yuklanmoqda..." })}
        </p>
      </div>
    );
  }

  return (
    <>
      <NotificationsRealtimeBridge />
      {children}
    </>
  );
}
