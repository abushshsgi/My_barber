const HIDE_SCROLL_TOP_EXACT = new Set(["/auth", "/onboarding", "/map", "/ai-style"]);
const HIDE_SCROLL_TOP_PREFIX = ["/stories/", "/chat/"];

export function shouldShowScrollToTop(pathname: string): boolean {
  if (HIDE_SCROLL_TOP_EXACT.has(pathname)) return false;
  return !HIDE_SCROLL_TOP_PREFIX.some((prefix) => pathname.startsWith(prefix));
}
