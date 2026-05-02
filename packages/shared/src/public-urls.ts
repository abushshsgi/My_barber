/**
 * Alohida domenlarda sartarosh ilovasiga havola (asosiy sahifa `/`, kirish `/auth`).
 * Production: NEXT_PUBLIC_BARBER_WEB_ORIGIN=https://barber.sizning-domen.uz
 * Lokal (alohida port): http://localhost:3003
 */
function readPublicEnv(name: string): string {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const processEnv = typeof process !== "undefined" ? process.env?.[name] : undefined;
  return viteEnv?.[name] || processEnv || "";
}

export function barberWebUrl(path: string): string {
  const origin = readPublicEnv("NEXT_PUBLIC_BARBER_WEB_ORIGIN").replace(/\/$/, "");
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
  const origin = readPublicEnv("NEXT_PUBLIC_USER_WEB_ORIGIN").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  if (origin) return `${origin}${p}`;
  return p;
}
