import { normalizePathname } from "./url";

const NOINDEX_EXACT = new Set([
  "/auth",
  "/settings",
  "/profile",
  "/bookings",
  "/onboarding",
  "/notifications",
  "/wallet",
  "/wallet/top-up",
  "/wallet/qr-pay",
  "/wallet/gifts",
  "/wallet/history",
  "/subscriptions",
  "/subscriptions/payme",
  "/chat",
  "/referrals",
  "/loyalty",
  "/favorites",
  "/favorite-stylists",
  "/sessions",
  "/payment-methods",
  "/addresses",
  "/family",
  "/giftcard",
  "/support",
  "/privacy",
  "/verify-email",
  "/ai-style/history",
  "/ai-style/report",
  "/ai-style/help",
  "/ai-style/studio",
  "/explore-gen",
]);

const NOINDEX_PREFIXES = [
  "/auth/",
  "/wallet",
  "/subscriptions",
  "/settings",
  "/bookings/",
  "/chat/",
  "/dev/",
  "/account/",
  "/ai-style/care/ingredient/",
];

export function isNoindexPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (NOINDEX_EXACT.has(path)) return true;
  return NOINDEX_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
}
