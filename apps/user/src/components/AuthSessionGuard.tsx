import { useEffect, type ReactNode } from "react";
import { bootstrapUserSession, handleAuthFailure } from "@/lib/api/client";
import { clearQueryClientCache } from "@/lib/query-client";

const AUTH_PATH = "/auth";
const TOKEN_KEY = "mybarber_user_access";
const USER_KEY = "mysaloon.auth.user";

function isAuthRoute(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return path === AUTH_PATH || path.startsWith(`${AUTH_PATH}/`);
}

/** Tab qayta ochilganda refresh token orqali sessiyani tiklash. */
export function AuthSessionGuard({ children }: { children: ReactNode }) {
  useEffect(() => {
    const verify = () => {
      if (isAuthRoute()) return;
      void bootstrapUserSession().then((ok) => {
        if (!ok) handleAuthFailure();
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

  return children;
}
