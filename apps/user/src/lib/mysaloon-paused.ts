/** Mobil MySaloon: bron va kashfiyot to‘xtatilgan. Desktop bu ro‘yxatdan mustasno. */
export function isMysaloonPausedPath(pathname: string): boolean {
  if (
    pathname === "/" ||
    pathname === "/map" ||
    pathname === "/explore" ||
    pathname === "/today" ||
    pathname === "/offers" ||
    pathname === "/top" ||
    pathname === "/bookings"
  ) {
    return true;
  }
  if (pathname.startsWith("/bookings/")) return true;
  if (pathname === "/booking" || pathname.startsWith("/booking/")) return true;
  if (pathname.startsWith("/salon/")) return true;
  if (pathname.startsWith("/barber/")) return true;
  if (pathname.startsWith("/category/")) return true;
  return false;
}
