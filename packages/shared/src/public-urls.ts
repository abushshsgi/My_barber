/**
 * Alohida domenlarda sartarosh ilovasiga havola (asosiy sahifa `/`, kirish `/auth`).
 * Production: NEXT_PUBLIC_BARBER_WEB_ORIGIN=https://barber.sizning-domen.uz
 * Lokal (alohida port): http://localhost:3002
 */
export function barberWebUrl(path: string): string {
  const origin = (process.env.NEXT_PUBLIC_BARBER_WEB_ORIGIN || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  if (origin) return `${origin}${p}`;
  return p;
}

/**
 * Mijoz ilovasiga havola (kirish `/auth`).
 * Production: NEXT_PUBLIC_USER_WEB_ORIGIN=https://app.sizning-domen.uz
 * Lokal: http://localhost:3000
 */
export function userWebUrl(path: string): string {
  const origin = (process.env.NEXT_PUBLIC_USER_WEB_ORIGIN || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  if (origin) return `${origin}${p}`;
  return p;
}
