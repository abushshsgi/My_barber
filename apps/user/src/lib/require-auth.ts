import { redirect } from "@tanstack/react-router";
import { bootstrapUserSession, hasValidUserSession } from "@/lib/api/client";

/** Faqat shu yo'lchalar login talab qiladi — qolganlari (bosh sahifa, xarita, salon) ochiq. */
const AUTH_REQUIRED_PREFIXES = [
  "/bookings",
  "/profile",
  "/settings",
  "/favorites",
  "/favorite-stylists",
  "/wallet",
  "/onboarding",
  "/chat",
  "/notifications",
  "/addresses",
  "/account/",
  "/payment-methods",
  "/sessions",
  "/subscriptions",
  "/family",
  "/giftcard",
  "/loyalty",
  "/ai-style",
  "/verify-email",
  "/today",
  "/reviews",
  "/support",
  "/booking/",
  "/explore-gen",
  "/dev.explore-gen",
] as const;

function requiresAuth(pathname: string): boolean {
  return AUTH_REQUIRED_PREFIXES.some((prefix) => {
    if (prefix.endsWith("/")) return pathname.startsWith(prefix);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

export async function requireAuth(pathname: string) {
  if (typeof window === "undefined") return;
  if (!requiresAuth(pathname)) return;
  if (hasValidUserSession()) return;
  const ok = await bootstrapUserSession();
  if (!ok) {
    throw redirect({ to: "/auth", search: { redirect: pathname } });
  }
}

export async function redirectIfAuthenticated() {
  if (typeof window === "undefined") return;
  const ok = await bootstrapUserSession();
  if (ok) {
    throw redirect({ to: "/" });
  }
}
