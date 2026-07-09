/** Demo muhit — demo.mysaloon.uz va demo.partner.mysaloon.uz */

export const DEMO_USER_HOST = "demo.mysaloon.uz";
export const DEMO_PARTNER_HOST = "demo.partner.mysaloon.uz";
export const DEMO_API_ORIGIN = "https://api-demo.mysaloon.uz";

const DEMO_HOSTS = new Set([DEMO_USER_HOST, DEMO_PARTNER_HOST]);

export function isDemoHostname(hostname: string | null | undefined): boolean {
  const host = (hostname || "").trim().toLowerCase().split(":")[0];
  return DEMO_HOSTS.has(host);
}

export function resolveDemoApiOrigin(hostname: string | null | undefined): string | null {
  return isDemoHostname(hostname) ? DEMO_API_ORIGIN : null;
}
