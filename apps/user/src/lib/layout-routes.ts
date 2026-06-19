export type DesktopContentProfile = "discovery" | "standard" | "compact";

const FOOTER_EXACT = new Set(["/", "/explore", "/offers", "/support", "/privacy"]);

const DISCOVERY_EXACT = new Set([
  "/",
  "/explore",
  "/offers",
  "/map",
  "/today",
  "/compare",
]);

const DISCOVERY_PREFIX = ["/salon/"];

const STANDARD_PREFIX = [
  "/bookings",
  "/booking/",
  "/chat",
  "/wallet",
  "/ai-style",
  "/profile",
  "/account/",
  "/notifications",
  "/settings",
  "/support",
  "/reviews",
  "/favorites",
  "/favorite-stylists",
  "/family",
  "/addresses",
  "/payment-methods",
  "/giftcard",
  "/loyalty",
  "/subscriptions",
  "/reels",
  "/stories",
  "/onboarding",
];

const COMPACT_EXACT = new Set(["/auth", "/onboarding"]);

const AUDIENCE_TOPBAR_EXACT = new Set(["/", "/explore", "/map", "/today", "/offers"]);

export function showsSiteFooter(pathname: string): boolean {
  return FOOTER_EXACT.has(pathname);
}

/** @deprecated Use getDesktopContentProfile */
export function usesWideDesktopContent(pathname: string): boolean {
  return getDesktopContentProfile(pathname) === "discovery";
}

export function getDesktopContentProfile(pathname: string): DesktopContentProfile {
  if (COMPACT_EXACT.has(pathname)) return "compact";
  if (DISCOVERY_EXACT.has(pathname)) return "discovery";
  if (DISCOVERY_PREFIX.some((p) => pathname.startsWith(p))) return "discovery";
  if (STANDARD_PREFIX.some((p) => pathname === p || pathname.startsWith(p))) return "standard";
  if (pathname.startsWith("/explore/")) return "discovery";
  return "standard";
}

export function getDesktopMaxWidthClass(profile: DesktopContentProfile): string {
  switch (profile) {
    case "discovery":
      return "lg:max-w-[1280px]";
    case "compact":
      return "lg:max-w-[560px]";
    default:
      return "lg:max-w-[720px]";
  }
}

export function showsAudienceInTopBar(pathname: string): boolean {
  return AUDIENCE_TOPBAR_EXACT.has(pathname) || pathname.startsWith("/explore");
}

export function getPageTitleKey(pathname: string): string | null {
  if (pathname === "/") return "nav.home";
  if (pathname === "/map") return "nav.map";
  if (pathname === "/bookings" || pathname.startsWith("/booking")) return "nav.bookings";
  if (pathname.startsWith("/chat")) return "nav.chat";
  if (pathname === "/profile") return "nav.profile";
  if (pathname === "/explore" || pathname.startsWith("/explore/")) return "home.quick.trends";
  if (pathname === "/offers") return "home.quick.offers";
  if (pathname === "/today") return "home.quick.today";
  if (pathname === "/compare") return "home.quick.compare";
  if (pathname === "/wallet" || pathname.startsWith("/wallet/")) return "nav.wallet";
  if (pathname === "/ai-style") return "home.quick.aiStyle";
  if (pathname === "/notifications") return "nav.notifications";
  if (pathname === "/settings") return "profile.settings";
  if (pathname === "/favorites") return "profile.favorites";
  if (pathname === "/support") return "profile.support";
  if (pathname.startsWith("/salon/")) return "common.salon";
  return null;
}
