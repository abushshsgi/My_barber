import { useEffect, type ReactNode } from "react";
import { bootstrapUserSession, handleAuthFailure } from "@/lib/api/client";

const AUTH_PATH = "/auth";

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

  return children;
}
