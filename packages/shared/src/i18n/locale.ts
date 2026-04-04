export const LOCALES = ["uz", "ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_STORAGE_KEY = "mybarber_locale";
export const DEFAULT_LOCALE: Locale = "uz";

export function parseLocale(raw: string | null | undefined): Locale {
  if (raw === "ru" || raw === "en" || raw === "uz") return raw;
  return DEFAULT_LOCALE;
}

/** Brauzer tilidan boshlang‘ich taxmin (faqat client). */
export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const lang = (navigator.language || "").slice(0, 2).toLowerCase();
  if (lang === "ru") return "ru";
  if (lang === "en") return "en";
  return "uz";
}
