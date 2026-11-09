import { redirect } from "@tanstack/react-router";
import { bootstrapUserSession, hasValidUserSession } from "@/lib/api/client";
import { pathRequiresAuth } from "@/lib/auth-routes";
import { buildExternalPageUrl } from "@/lib/external-browser";
import { rememberEntrySearch, safeAuthRedirectPath } from "@/lib/referral-storage";

export { pathRequiresAuth } from "@/lib/auth-routes";

/** Loginidan keyin qaytish: path, query, UTM. Tokenlar URLda qolmaydi. */
export function buildAuthReturnPath(
  pathname: string,
  searchStr = "",
  hash = "",
): string | undefined {
  const absolute = buildExternalPageUrl({
    origin: "https://mysaloon.uz",
    pathname,
    search: searchStr,
    hash,
  });
  const url = new URL(absolute);
  return safeAuthRedirectPath(`${url.pathname}${url.search}${url.hash}`);
}

export async function requireAuth(pathname: string, searchStr = "", hash = "") {
  if (typeof window === "undefined") return;
  rememberEntrySearch(searchStr);
  if (!pathRequiresAuth(pathname)) return;
  if (hasValidUserSession()) return;
  const ok = await bootstrapUserSession();
  if (!ok) {
    const redirectTo = buildAuthReturnPath(pathname, searchStr, hash);
    throw redirect({
      to: "/auth",
      search: redirectTo ? { redirect: redirectTo } : {},
    });
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
