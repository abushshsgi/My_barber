/** Mijoz ilovasida auth yuborilmasligi kerak bo‘lgan ochiq API yo‘llari. */
export function isPublicCustomerApiPath(path: string): boolean {
  const p = (path.split("?")[0] ?? path).replace(/\/+$/, "") || "/";
  if (p === "/api/v1/salons") return true;
  if (/^\/api\/v1\/salons\/\d+$/.test(p)) return true;
  if (/^\/api\/v1\/salons\/\d+\/(staff|rating-summary|barber-services|portfolio)$/.test(p)) {
    return true;
  }
  if (p.startsWith("/api/v1/bookings/availability")) return true;
  if (p === "/api/v1/reviews" || (p.startsWith("/api/v1/reviews/") && !p.includes("mine"))) {
    return true;
  }
  return false;
}
