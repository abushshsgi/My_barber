/** Brauzer/PWA: joriy origin. Ulashish uchun fallback. */
export const PUBLIC_SITE_ORIGIN = "https://www.mysaloon.uz";

/** Ulashish, to‘lov return_url, deep link uchun public sayt origin. */
export function getPublicSiteOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin;
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
