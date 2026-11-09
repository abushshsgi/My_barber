import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { hasValidUserSession } from "@/lib/api/client";
import { buildAuthReturnPath } from "@/lib/require-auth";

/** Tugma yoki funksiya: sessiya bo'lmasa login ochiladi va shu sahifaga qaytadi. */
export function useActionAuth() {
  const navigate = useNavigate();

  return useCallback(() => {
    if (hasValidUserSession()) return true;
    if (typeof window === "undefined") return false;
    const redirectTo = buildAuthReturnPath(
      window.location.pathname,
      window.location.search,
      window.location.hash,
    );
    void navigate({
      to: "/auth",
      search: redirectTo ? { redirect: redirectTo } : {},
    });
    return false;
  }, [navigate]);
}
