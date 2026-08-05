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

  let mustOnboard = false;
  try {
    const { fetchMe } = await import("@/lib/api/user");
    const { needsOnboarding } = await import("@/lib/recommendations");
    const { getAuthUser } = await import("@/lib/auth");
    try {
      const me = await fetchMe();
      mustOnboard = needsOnboarding(me);
    } catch {
      const cached = getAuthUser();
      mustOnboard = cached ? needsOnboarding(cached) : false;
    }
  } catch {
    mustOnboard = false;
  }

  if (mustOnboard) {
    throw redirect({ to: "/onboarding" });
  }
  if (redirectTo) {
    throw redirect({ href: redirectTo });
  }
  throw redirect({ to: "/" });
}
