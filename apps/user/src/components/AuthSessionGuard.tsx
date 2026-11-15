import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  bootstrapUserSession,
  handleAuthFailure,
  hasStoredUserCredential,
  hasValidUserSession,
} from "@/lib/api/client";
import { guestMustLogin } from "@/lib/auth-routes";
import { getActiveUserId, prepareFaceProfileStorageForUser } from "@/lib/face-profile";
import { useNotificationsWebSocket } from "@/hooks/use-notifications-websocket";
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const enable = () => setReady(true);
    if (document.readyState === "complete") enable();
    else window.addEventListener("load", enable, { once: true });
    return () => window.removeEventListener("load", enable);
  }, []);

  useNotificationsWebSocket(ready);
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

  const mustLogin = guestMustLogin(pathname, hasValidUserSession());
  const restoringSession = mustLogin && hasStoredUserCredential();

  useLayoutEffect(() => {
    if (!mustLogin || restoringSession) return;
    sendToLogin();
  }, [mustLogin, restoringSession, sendToLogin]);

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
          if (refreshHistory) {
            void import("@/lib/api/ai").then((m) => m.refreshAiStyleHistoryCache());
          }
        }
        window.dispatchEvent(new CustomEvent("mysaloon:auth-ready"));
        void import("@/lib/native-push").then((m) => m.registerPushNotifications());
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

  if (mustLogin) {
    if (!restoringSession) return null;
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
