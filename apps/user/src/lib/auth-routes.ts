/**
 * Mehmon sahifani ko'ra oladi. Funksiya va tugma alohida login so'raydi.
 * Ko'rish: bosh sahifa, profil, try-on, chatbot.
 */
const PUBLIC_PATHS = new Set([
  "/",
  "/profile",
  "/ai-style",
  "/ai-style/chat",
  "/auth",
  "/privacy-policy",
  "/terms-of-use",
  "/delete-account",
  "/for-salons",
]);

/** /explore/:styleId/try — try-on sahifasini ko'rish. */
function isGuestTryOnPath(path: string): boolean {
  return /^\/explore\/[^/]+\/try$/.test(path);
}

function normalizePath(pathname: string): string {
  const raw = (pathname.split("?")[0] ?? pathname).split("#")[0] || "/";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  if (withSlash.length > 1 && withSlash.endsWith("/")) return withSlash.slice(0, -1);
  return withSlash;
}

export function pathRequiresAuth(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (path === "/auth" || path.startsWith("/auth/")) return false;
  if (isGuestTryOnPath(path)) return false;
  return !PUBLIC_PATHS.has(path);
}

/** Login qilinmagan mehmon himoyalangan sahifada qolmasin. */
export function guestMustLogin(pathname: string, hasSession: boolean): boolean {
  return pathRequiresAuth(pathname) && !hasSession;
}
