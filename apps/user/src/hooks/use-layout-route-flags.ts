import { isMobileFlushPage, showsSiteFooter } from "@/lib/layout-routes";
import { usesDesktopBazaarInset } from "@/lib/desktop-bazaar-layout";

const FULL_BLEED_PREFIX = ["/map", "/stories/"];

export function useLayoutRouteFlags(pathname: string) {
  const isAiStyle = pathname === "/ai-style";
  const isMap = pathname === "/map";
  const isFullBleed =
    isAiStyle ||
    isMap ||
    FULL_BLEED_PREFIX.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isViewportLocked = isAiStyle || isMap;
  const showFooter = showsSiteFooter(pathname) && !isFullBleed;
  const bazaarInset = usesDesktopBazaarInset(pathname);
  const isHome = pathname === "/";
  const isSalonPage = pathname.startsWith("/salon/");
  const isMobileFlush = isMobileFlushPage(pathname);

  return {
    isAiStyle,
    isMap,
    isFullBleed,
    isViewportLocked,
    showFooter,
    bazaarInset,
    isHome,
    isSalonPage,
    isMobileFlush,
  };
}
