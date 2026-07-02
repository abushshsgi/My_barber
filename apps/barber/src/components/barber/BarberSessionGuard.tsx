import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  bootstrapBarberSession,
  handleBarberAuthFailure,
  resetBarberAuthFailureGuard,
  resetBarberSessionBootstrap,
} from "@/lib/barber-auth-session";
import { getBarberAccessToken } from "@/lib/api";

const AUTH_PATH = "/auth";
const TOKEN_KEY = "mybarber_barber_access";

function isAuthRoute(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return path === AUTH_PATH || path.startsWith(`${AUTH_PATH}/`);
}

/** Tab qayta ochilganda refresh token orqali barber sessiyasini tiklash. */
export function BarberSessionGuard({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  useEffect(() => {
    resetBarberAuthFailureGuard();
  }, []);

  useEffect(() => {
    const verify = () => {
      if (isAuthRoute()) return;
      void bootstrapBarberSession().then((ok) => {
        if (!ok && !getBarberAccessToken()) {
          handleBarberAuthFailure("expired");
          return;
        }
        if (ok) {
          void qc.invalidateQueries();
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
  }, [qc]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== TOKEN_KEY) return;
      if (!e.newValue && e.oldValue) {
        resetBarberSessionBootstrap();
        handleBarberAuthFailure("expired");
        return;
      }
      if (e.newValue !== e.oldValue) {
        resetBarberSessionBootstrap();
        void qc.invalidateQueries();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [qc]);

  return children;
}
