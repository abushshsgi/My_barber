import { Capacitor } from "@capacitor/core";

/** Brauzer/PWA: joriy origin. Capacitor: www.mysaloon.uz (localhost emas). */
export const PUBLIC_SITE_ORIGIN = "https://www.mysaloon.uz";

function isMobileSpa(): boolean {
  return (
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.VITE_MOBILE_SPA === "true"
  );
}

/** Ulashish, to‘lov return_url, deep link uchun public sayt origin. */
export function getPublicSiteOrigin(): string {
  if (isMobileSpa() || (typeof window !== "undefined" && Capacitor.isNativePlatform())) {
    return PUBLIC_SITE_ORIGIN;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin;
    // Capacitor androidScheme https → https://localhost
    if (/^https?:\/\/localhost(?::\d+)?$/i.test(origin)) {
      return PUBLIC_SITE_ORIGIN;
    }
    return origin;
  }
  return PUBLIC_SITE_ORIGIN;
}

/** `/salon/123` kabi pathni absolute public URL ga. */
export function publicAppUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicSiteOrigin()}${p}`;
}
