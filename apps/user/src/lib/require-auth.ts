import { redirect } from "@tanstack/react-router";
import { bootstrapUserSession, hasValidUserSession } from "@/lib/api/client";
import { pathRequiresAuth } from "@/lib/auth-routes";
import { safeAuthRedirectPath } from "@/lib/referral-storage";

export { pathRequiresAuth } from "@/lib/auth-routes";

export async function requireAuth(pathname: string) {
  if (typeof window === "undefined") return;
  if (!pathRequiresAuth(pathname)) return;
  if (hasValidUserSession()) return;
  const ok = await bootstrapUserSession();
  if (!ok) {
    throw redirect({ to: "/auth", search: { redirect: pathname } });
  }
}

export async function redirectIfAuthenticated() {
  if (typeof window === "undefined") return;
  const ok = await bootstrapUserSession();
  if (!ok) return;
  const params = new URLSearchParams(window.location.search);
  const redirectTo = safeAuthRedirectPath(params.get("redirect"));
  if (redirectTo) {
    throw redirect({ href: redirectTo });
  }
  throw redirect({ to: "/" });
}
