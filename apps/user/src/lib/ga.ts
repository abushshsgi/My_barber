/** Google Analytics 4 — www.mysaloon.uz web stream. Measurement ID is public. */
export const GA_MEASUREMENT_ID =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() || "G-38QNBFBNZG";

/** Production web only — skip local/dev and Capacitor mobile SPA. */
export const GA_ENABLED =
  import.meta.env.PROD && import.meta.env.VITE_MOBILE_SPA !== "true" && Boolean(GA_MEASUREMENT_ID);

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

/** Yangi foydalanuvchi → sign_up; mavjud → login (GA4 recommended events). */
export function trackAuthSuccess(opts: {
  isNewUser: boolean;
  method: "google" | "phone" | "password";
}) {
  trackEvent(opts.isNewUser ? "sign_up" : "login", { method: opts.method });
}

export type AuthFunnelStep =
  | "view"
  | "phone_continue"
  | "otp_sent"
  | "otp_verified"
  | "password_step"
  | "set_password_step"
  | "abandoned";

/** Ro'yxat/login funnel — chala (tugallanmagan) jarayonni ham ko'rish uchun. */
export function trackAuthFunnel(
  step: AuthFunnelStep,
  params?: { intent?: "login" | "register"; method?: string },
) {
  trackEvent("auth_funnel", { funnel_step: step, ...params });
}

/** Morf AI natijasi qayerdan ulashilgani. */
export type MorphShareSurface = "history" | "preview" | "landing";

/**
 * Viral halqa funneli: ulashish → havola ochilishi → try-on bosilishi.
 * GA4 da bitta `morph_share` hodisasi sifatida, `funnel_step` bilan ajratiladi.
 */
export type MorphShareStep =
  | "story_start"
  | "story_shared"
  | "story_downloaded"
  | "story_cancelled"
  | "story_failed"
  | "link_shared"
  | "landing_view"
  | "landing_try_click";

export function trackMorphShare(
  step: MorphShareStep,
  params?: {
    surface?: MorphShareSurface;
    styleId?: string;
    shareId?: string;
    authed?: boolean;
  },
) {
  trackEvent("morph_share", {
    funnel_step: step,
    surface: params?.surface,
    style_id: params?.styleId,
    share_id: params?.shareId,
    authed: params?.authed,
  });
}
