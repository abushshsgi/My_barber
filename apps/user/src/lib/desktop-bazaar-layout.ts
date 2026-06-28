/** Responsive horizontal gutter for shell header, bazaar content, and footer. */
export const DESKTOP_SHELL_INSET =
  "px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-[150px]";

/** Bazaar-style pages align main content with the shell inset. */
export const DESKTOP_BAZAAR_INSET = DESKTOP_SHELL_INSET;

/** Elevated home tile: 4:3 media + text block ending at price line */
export const BAZAAR_ELEVATED_TILE_H = "h-[var(--bazaar-tile-h)]";

export function usesDesktopBazaarInset(pathname: string): boolean {
  if (pathname === "/" || pathname === "/top") return true;
  if (pathname.startsWith("/category/")) return true;
  return false;
}
