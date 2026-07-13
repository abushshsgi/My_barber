/** Google Analytics 4 — www.mysaloon.uz web stream. Measurement ID is public. */
export const GA_MEASUREMENT_ID =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() || "G-38UNBFBNZG";

/** Production web only — skip local/dev and Capacitor mobile SPA. */
export const GA_ENABLED =
  import.meta.env.PROD &&
  import.meta.env.VITE_MOBILE_SPA !== "true" &&
  Boolean(GA_MEASUREMENT_ID);

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function gtag(...args: unknown[]) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag(...args);
}

export function trackPageView(path: string, title?: string) {
  if (!GA_ENABLED) return;
  gtag("event", "page_view", {
    page_path: path,
    page_title: title || (typeof document !== "undefined" ? document.title : path),
    page_location: typeof window !== "undefined" ? window.location.href : path,
  });
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (!GA_ENABLED) return;
  gtag("event", name, params);
}
