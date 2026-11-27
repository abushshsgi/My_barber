import { shouldShowMobileDock } from "@/lib/layout-routes";

/** Fixed desktop sidebar width — keep in sync with Tailwind arbitrary values. */
export const DESKTOP_SIDEBAR_WIDTH_PX = 260;

export const DESKTOP_SIDEBAR_OFFSET_CLASS = "lg:pl-[260px]" as const;
export const DESKTOP_SIDEBAR_LEFT_CLASS = "lg:left-[260px]" as const;

/** Pastki dock — `styles.css` dagi `--mobile-dock` bilan bir xil. */
export const MOBILE_DOCK_OFFSET =
  "var(--mobile-dock, calc(clamp(3.15rem, 11.5vw, 3.6rem) + env(safe-area-inset-bottom, 0px)))" as const;

export const MOBILE_SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)" as const;

/** Sahifa kontenti uchun standart pastki padding (dock + qo'shimcha bo'shliq). */
export const MOBILE_CONTENT_PADDING_BOTTOM = MOBILE_DOCK_OFFSET;

/** Tailwind arbitrary value sifatida ishlatish uchun. */
export const MOBILE_CONTENT_PADDING_CLASS = "pb-[var(--mobile-dock)]" as const;

/** Sticky action bar balandligi (dock yo'q sahifalar). */
export const MOBILE_STICKY_ACTIONS_OFFSET =
  "calc(5.5rem + env(safe-area-inset-bottom, 0px))" as const;

/** Sticky action bar ustidagi kontent uchun pastki padding.
 * Dock bo'lsa UserLayout allaqachon dock+safe-area beradi — faqat action bar balandligi.
 */
export const MOBILE_STICKY_CONTENT_PADDING_CLASS = "pb-[5.5rem]" as const;

export const MOBILE_STICKY_CONTENT_PADDING_NO_DOCK_CLASS =
  "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]" as const;

export function getMobileBottomInset(pathname: string): string {
  return shouldShowMobileDock(pathname) ? MOBILE_DOCK_OFFSET : MOBILE_SAFE_BOTTOM;
}

export function getMobileContentPaddingClass(pathname: string): string {
  return shouldShowMobileDock(pathname)
    ? MOBILE_CONTENT_PADDING_CLASS
    : "pb-[env(safe-area-inset-bottom,0px)]";
}

export function getMobileStickyContentPaddingClass(pathname: string): string {
  return shouldShowMobileDock(pathname)
    ? MOBILE_STICKY_CONTENT_PADDING_CLASS
    : MOBILE_STICKY_CONTENT_PADDING_NO_DOCK_CLASS;
}
