/** Horizontal gutter for bazaar-style desktop pages (header, hero, grids). */
export const DESKTOP_BAZAAR_INSET = "px-[150px]";

export function usesDesktopBazaarInset(pathname: string): boolean {
  if (pathname === "/" || pathname === "/top") return true;
  if (pathname.startsWith("/category/")) return true;
  return false;
}
