const FOOTER_EXACT = new Set(["/", "/explore", "/offers", "/support", "/privacy"]);

const WIDE_DESKTOP_EXACT = new Set(["/", "/explore", "/offers"]);

export function showsSiteFooter(pathname: string): boolean {
  return FOOTER_EXACT.has(pathname);
}

export function usesWideDesktopContent(pathname: string): boolean {
  return WIDE_DESKTOP_EXACT.has(pathname);
}
