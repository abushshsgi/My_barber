/** Web `/barber/...` → Expo Router yo‘llari. */
/** Web signup / onboarding yo‘llari → mobil Expo Router. */
export const SETUP_WEB_TO_MOBILE_ROUTE: Record<string, string> = {
  "/salon/create": "/(setup)/salon/create",
  "/salon/join": "/(setup)/salon/join",
  "/salon/join/setup": "/(setup)/salon/join/setup",
  "/mybarber/setup": "/(setup)/mybarber",
  "/independent/setup": "/(setup)/independent",
  "/auth": "/(auth)/login",
};

export function webSetupPathToMobile(webPath: string): string {
  const pathOnly = webPath.split("#")[0]?.trim() || webPath;
  return SETUP_WEB_TO_MOBILE_ROUTE[pathOnly] ?? webRouteToMobile(pathOnly);
}

export const WEB_TO_MOBILE_ROUTE: Record<string, string> = {
  "/barber": "/(barber)/index",
  "/barber/calendar": "/(barber)/calendar",
  "/barber/bookings": "/(barber)/bookings",
  "/barber/services": "/(barber)/services",
  "/barber/clients": "/(barber)/clients",
  "/barber/chat": "/(barber)/chat",
  "/barber/notifications": "/(barber)/notifications",
  "/barber/reviews": "/(barber)/reviews",
  "/barber/portfolio": "/(barber)/portfolio",
  "/barber/earnings": "/(barber)/earnings",
  "/barber/expenses": "/(barber)/expenses",
  "/barber/inventory": "/(barber)/inventory",
  "/barber/stats": "/(barber)/stats",
  "/barber/marketing": "/(barber)/marketing",
  "/barber/goals": "/(barber)/goals",
  "/barber/profile": "/(barber)/profile",
  "/barber/settings": "/(barber)/settings",
  "/barber/help": "/(barber)/help",
  "/barber/activation": "/(onboarding)/activation",
  "/verify-email": "/verify-email",
  "/check-email": "/check-email",
  "/barber/verify-email": "/verify-email",
  "/barber/salon-view": "/(barber)/salon-view",
  "/barber/salon-view/edit": "/(barber)/salon-view/edit",
  "/barber/salon-view/gallery": "/(barber)/salon-view/gallery",
  "/barber/salon-view/reviews": "/(barber)/salon-view/reviews",
  "/barber/salon-view/team": "/(barber)/salon-view/team",
  "/barber/salon-view/members": "/(barber)/salon-view/members",
};

export function webRouteToMobile(webPath: string): string {
  const exact = WEB_TO_MOBILE_ROUTE[webPath];
  if (exact) return exact;
  if (webPath.startsWith("/barber/chat/")) {
    const id = webPath.replace("/barber/chat/", "");
    return `/chat/${id}`;
  }
  return WEB_TO_MOBILE_ROUTE["/barber"] ?? "/(barber)/index";
}

/** 100% gate: web bilan bir xil — activation, verify-email, services. */
export function barberPathAllowedBeforeFullyReady(pathname: string): boolean {
  const p = pathname.toLowerCase();
  if (p.includes("activation")) return true;
  if (p.includes("verify-email")) return true;
  if (p.includes("/services")) return true;
  return false;
}

/** Salon workspace ichida ruxsat (mobil). */
export function mobilePathAllowedInSalonWorkspace(pathname: string): boolean {
  const p = pathname.toLowerCase();
  if (p.includes("salon-view")) return true;
  if (p.includes("/profile") || p.includes("/settings") || p.includes("/help")) return true;
  if (p.includes("/notifications")) return true;
  if (p.includes("/chat")) return true;
  return false;
}
