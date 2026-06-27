/** Aktivatsiya (fully_ready=false) paytida ochiq bo‘lgan barber panel yo‘llari. */
export function isBarberPathAllowedDuringActivation(pathname: string): boolean {
  if (pathname === "/verify-email" || pathname.startsWith("/verify-email")) return true;
  if (pathname === "/check-email" || pathname.startsWith("/check-email")) return true;
  if (pathname.startsWith("/barber/verify-email")) return true;
  if (pathname.startsWith("/barber/activation")) return true;
  if (pathname === "/barber/services" || pathname.startsWith("/barber/services/")) return true;
  if (pathname === "/barber/schedule" || pathname.startsWith("/barber/schedule/")) return true;
  return false;
}

export const ACTIVATION_NAV_TARGETS = [
  "/barber/activation",
  "/barber/services",
  "/barber/schedule",
] as const;

export function isBarberNavAllowedDuringActivation(path: string): boolean {
  return (ACTIVATION_NAV_TARGETS as readonly string[]).includes(path);
}
