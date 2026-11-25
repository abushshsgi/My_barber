import { normalizePathname as normalizeSeoPath } from "@/seo/url";

/**
 * Mehmon sahifani ko'ra oladi. Funksiya va tugma alohida login so'raydi.
 */
const PUBLIC_EXACT = new Set([
  "/",
  "/profile",
  "/ai-style",
  "/ai-style/chat",
  "/auth",
  "/privacy-policy",
  "/terms-of-use",
  "/delete-account",
  "/for-salons",
  "/explore",
  "/map",
  "/today",
  "/top",
  "/compare",
  "/booking",
  "/morf-ai",
  "/morf-ai/try-on",
  "/morf-ai/hairstyles",
  "/morf-ai/hair-care",
  "/morf-ai/ingredient-scanner",
  "/morf-ai/chat",
  "/morf-ai/weather-care",
]);

/** /explore/:styleId/try — try-on sahifasini ko'rish. */
function isGuestTryOnPath(path: string): boolean {
  return /^\/explore\/[^/]+\/try$/.test(path);
}

function isGuestExploreStylePath(path: string): boolean {
  return /^\/explore\/[^/]+$/.test(path);
}

function isGuestSalonPath(path: string): boolean {
  return /^\/salon\/[^/]+$/.test(path);
}

function isGuestBarberPath(path: string): boolean {
  return /^\/barber\/[^/]+$/.test(path);
}

function isGuestMorphSharePath(path: string): boolean {
  return /^\/morf-ai\/(share|look)\/[^/]+$/.test(path);
}

function isLocaleMarketingPath(path: string): boolean {
  return /^\/(ru|en)(\/.*)?$/.test(path);
}

function isMorfAiMarketingPath(path: string): boolean {
  return path === "/morf-ai" || path.startsWith("/morf-ai/");
}

/** Hair Advisor natija UI demo (statik, APIsiz). */
function isHairAdvisorResultDemoPath(path: string): boolean {
  return path === "/ai-style/care/ingredient/result/demo" || path === "/ai-style/care/ingredient/result/preview";
}

function normalizePath(pathname: string): string {
  return normalizeSeoPath(pathname);
}

export { isNoindexPath } from "@/seo/noindex";

export function pathRequiresAuth(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (path === "/auth" || path.startsWith("/auth/")) return false;
  if (isGuestTryOnPath(path)) return false;
  if (isHairAdvisorResultDemoPath(path)) return false;
  if (isGuestExploreStylePath(path)) return false;
  if (isGuestSalonPath(path)) return false;
  if (isGuestBarberPath(path)) return false;
  if (isGuestMorphSharePath(path)) return false;
  if (isLocaleMarketingPath(path)) return false;
  if (isMorfAiMarketingPath(path) && !isGuestMorphSharePath(path)) return false;
  if (PUBLIC_EXACT.has(path)) return false;
  return true;
}

/** Login qilinmagan mehmon himoyalangan sahifada qolmasin. */
export function guestMustLogin(pathname: string, hasSession: boolean): boolean {
  return pathRequiresAuth(pathname) && !hasSession;
}