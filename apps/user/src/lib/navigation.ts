/** Bottom nav / sidebar tab active state (exact parent routes, not nested siblings). */
export function isNavTabActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  if (to === "/bookings") {
    return pathname === "/bookings" || pathname.startsWith("/booking");
  }
  if (to === "/chat") {
    return pathname === "/chat" || pathname.startsWith("/chat/");
  }
  if (to === "/wallet") {
    return (
      pathname === "/wallet" ||
      pathname.startsWith("/wallet/") ||
      pathname === "/loyalty" ||
      pathname.startsWith("/loyalty/")
    );
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** True when the tab target is already shown (including nested child routes). */
export function isNavTabCurrent(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  if (to === "/bookings") {
    return pathname === "/bookings" || pathname.startsWith("/booking");
  }
  if (to === "/chat") {
    return pathname === "/chat" || pathname.startsWith("/chat/");
  }
  if (to === "/wallet") {
    return pathname === "/wallet" || pathname.startsWith("/wallet/");
  }
  return pathname === to;
}
