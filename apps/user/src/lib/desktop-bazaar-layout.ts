/** Responsive horizontal gutter for shell header, bazaar content, and footer. */
export const DESKTOP_SHELL_INSET =
  "px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16";

/** Desktop sticky header height — keep in sync with calc(100dvh-…) consumers. */
export const DESKTOP_HEADER_HEIGHT = "4.5rem";
export const DESKTOP_HEADER_HEIGHT_CLASS = "h-[4.5rem]";
export const DESKTOP_HEADER_OFFSET_CLASS = "lg:top-[4.5rem]";
export const DESKTOP_VIEWPORT_BELOW_HEADER = "h-[calc(100dvh-4.5rem)]";

/** Bazaar-style pages align main content with the shell inset. */
export const DESKTOP_BAZAAR_INSET = DESKTOP_SHELL_INSET;

/** Home bazaar: capped width so cards do not stretch on ultra-wide screens. */
export const DESKTOP_HOME_INSET =
  "mx-auto w-full max-w-[1680px] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-12";

/** Elevated home tile: 4:3 media + text block ending at price line */
export const BAZAAR_ELEVATED_TILE_H = "h-[var(--bazaar-tile-h)]";

export function usesDesktopBazaarInset(pathname: string): boolean {
  if (pathname === "/" || pathname === "/top") return true;
  if (pathname === "/offers" || pathname === "/explore") return true;
  if (pathname.startsWith("/category/")) return true;
  if (pathname.startsWith("/salon/")) return true;
  return false;
}
