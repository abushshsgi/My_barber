/** Horizontal gutter for bazaar-style desktop pages (header, hero, grids). */
export const DESKTOP_BAZAAR_INSET = "px-[150px]";

/** Elevated home tile: 4:3 media + text block ending at price line */
export const BAZAAR_ELEVATED_TILE_H = "h-[var(--bazaar-tile-h)]";

export function usesDesktopBazaarInset(pathname: string): boolean {
  if (pathname === "/" || pathname === "/top") return true;
  if (pathname.startsWith("/category/")) return true;
  return false;
}
