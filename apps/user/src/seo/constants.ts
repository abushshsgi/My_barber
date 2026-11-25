/** Canonical public origin (apex, no www). */
export const SITE_ORIGIN = "https://mysaloon.uz";

export const SEO_LOCALES = ["uz", "ru", "en"] as const;
export type SeoLocale = (typeof SEO_LOCALES)[number];

export const DEFAULT_LOCALE: SeoLocale = "uz";
export const HREFLANG_LOCALES: SeoLocale[] = ["uz", "ru", "en"];

export const ORG_NAME = "mysaloon.uz";
export const ORG_LOGO = `${SITE_ORIGIN}/brand-logo.png`;

export const MORF_STUDIO_ENABLED = false;
