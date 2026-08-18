import { isMobileFlushPage, showsSiteFooter } from "@/lib/layout-routes";
import { usesDesktopBazaarInset } from "@/lib/desktop-bazaar-layout";

const FULL_BLEED_PREFIX = ["/map", "/stories/"];

export function useLayoutRouteFlags(pathname: string) {
  const isAiStyle = pathname === "/ai-style";
  const isAiStyleSection = isAiStyle || pathname.startsWith("/ai-style/");
  const isMorfShare = pathname === "/morf-ai" || pathname.startsWith("/morf-ai/");
  const isExploreTry = /\/explore\/[^/]+\/try\/?$/.test(pathname);
  const isMorphType = isAiStyleSection || isMorfShare || isExploreTry;
  const isMap = pathname === "/map";
  const isFullBleed =
    isAiStyleSection ||
    isMorfShare ||
    isMap ||
    FULL_BLEED_PREFIX.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isViewportLocked = isAiStyle || isMap;
  const showFooter = showsSiteFooter(pathname) && !isFullBleed;
  const bazaarInset = usesDesktopBazaarInset(pathname);
  const isHome = pathname === "/";
  const isSalonPage = pathname.startsWith("/salon/");
  const isMobileFlush = isMobileFlushPage(pathname) || isAiStyleSection || isMorfShare;

  return {
    isAiStyle,
    isAiStyleSection,
    isMorphType,
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
