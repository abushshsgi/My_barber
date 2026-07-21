/** Partner (barber) web origin — footer / for-salons CTAs. */
export function getPartnerWebOrigin(): string {
  const fromVite = (import.meta.env.VITE_BARBER_WEB_ORIGIN as string | undefined)?.trim();
  const fromNext = (import.meta.env.NEXT_PUBLIC_BARBER_WEB_ORIGIN as string | undefined)?.trim();
  return fromVite || fromNext || "https://partner.mysaloon.uz";
}

export function partnerSignupUrl(flow?: "owner" | "employee" | "independent" | "mybarber"): string {
  const base = getPartnerWebOrigin().replace(/\/$/, "");
  const url = new URL(`${base}/auth`);
  url.searchParams.set("tab", "signup");
  if (flow) url.searchParams.set("flow", flow);
  return url.toString();
}

export function partnerWelcomeUrl(): string {
  return `${getPartnerWebOrigin().replace(/\/$/, "")}/welcome`;
}

export function partnerDemoUrl(): string {
  return "https://demo.partner.mysaloon.uz";
}
