/** Demo muhit — Vercel preview va kelajakdagi demo.mysaloon.uz domenlari */

export const DEMO_USER_HOSTS = [
  "demouser.vercel.app",
  "demo.mysaloon.uz",
] as const;

export const DEMO_PARTNER_HOSTS = [
  "demo-partner-eight.vercel.app",
  "demo.partner.mysaloon.uz",
] as const;

/** Railway demo API (alohida PostgreSQL + seed_demo) */
export const DEMO_API_ORIGIN = "https://celebrated-acceptance-production.up.railway.app";

/** @deprecated DEMO_USER_HOSTS[1] — eski importlar uchun */
export const DEMO_USER_HOST = DEMO_USER_HOSTS[1];

/** @deprecated DEMO_PARTNER_HOSTS[1] — eski importlar uchun */
export const DEMO_PARTNER_HOST = DEMO_PARTNER_HOSTS[1];

const DEMO_HOSTS = new Set<string>([...DEMO_USER_HOSTS, ...DEMO_PARTNER_HOSTS]);

export function isDemoHostname(hostname: string | null | undefined): boolean {
  const host = (hostname || "").trim().toLowerCase().split(":")[0];
  return DEMO_HOSTS.has(host);
}

export function resolveDemoApiOrigin(hostname: string | null | undefined): string | null {
  return isDemoHostname(hostname) ? DEMO_API_ORIGIN : null;
}
