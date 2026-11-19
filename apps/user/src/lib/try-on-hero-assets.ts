/** Shared LCP asset URLs — no React imports (safe for root route head / shell HTML). */

export const TRY_ON_HERO_BASE = "/ai-style/try-on-selfie-hero";
export const TRY_ON_HERO_WIDTHS = [480, 720, 864] as const;

export const TRY_ON_HERO_SRCSET = TRY_ON_HERO_WIDTHS.map((w) => `${TRY_ON_HERO_BASE}-${w}.webp ${w}w`).join(
  ", ",
);

/** Preload href (fallback when imagesrcset is unsupported). */
export const TRY_ON_HERO_PRELOAD = `${TRY_ON_HERO_BASE}-480.webp`;

export const TRY_ON_HERO_DEFAULT_SRC = TRY_ON_HERO_PRELOAD;

export { MORPH_LCP_BOOT_SCRIPT, removeMorphLcpStatic } from "./morph-lcp-static";