/**
 * Login shart bo'lgan yo'llar.
 * Bosh sahifa, xarita, salon, explore, offers — ochiq;
 * buyurtma / Morf AI / profil va shaxsiy bo'limlar — login.
 */
const AUTH_REQUIRED_PREFIXES = [
  "/bookings",
  "/booking/",
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
  "/referrals",
  "/giftcard",
  "/loyalty",
  "/ai-style",
  "/verify-email",
  "/today",
  "/reviews",
  "/explore-gen",
  "/dev.explore-gen",
] as const;

/** Public routes that never require authentication */
const PUBLIC_ROUTES = [
  "/",
  "/auth",
  "/privacy-policy",
  "/terms-of-use",
  "/for-salons",
  "/delete-account",
  "/explore",
  "/map",
  "/salon/",
  "/barber/",
] as const;

/** Morf / try-on: /explore/:id/try */
function isExploreTryPath(pathname: string): boolean {
  return /^\/explore\/[^/]+\/try\/?$/.test(pathname);
}

export function pathRequiresAuth(pathname: string): boolean {
  // Explicitly public routes
  if (PUBLIC_ROUTES.some((route) => {
    if (route.endsWith("/")) return pathname.startsWith(route);
    return pathname === route || pathname.startsWith(`${route}/`);
  })) {
    return false;
  }

  if (isExploreTryPath(pathname)) return true;
  return AUTH_REQUIRED_PREFIXES.some((prefix) => {
    if (prefix.endsWith("/")) return pathname.startsWith(prefix);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}
