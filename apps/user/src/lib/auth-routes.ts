/**
 * Mehmon faqat kirish va yuridik sahifalarda qoladi.
 * Bosh sahifa, try-on, Morf AI, salon va qolgan funksiyalar login talab qiladi.
 */
const PUBLIC_PATHS = new Set([
  "/auth",
  "/privacy-policy",
  "/terms-of-use",
  "/delete-account",
  "/for-salons",
]);

function normalizePath(pathname: string): string {
  const raw = (pathname.split("?")[0] ?? pathname).split("#")[0] || "/";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  if (withSlash.length > 1 && withSlash.endsWith("/")) return withSlash.slice(0, -1);
  return withSlash;
}

export function pathRequiresAuth(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (path === "/auth" || path.startsWith("/auth/")) return false;
  return !PUBLIC_PATHS.has(path);
}

/** Login qilinmagan mehmon himoyalangan sahifada qolmasin. */
export function guestMustLogin(pathname: string, hasSession: boolean): boolean {
  return pathRequiresAuth(pathname) && !hasSession;
}
