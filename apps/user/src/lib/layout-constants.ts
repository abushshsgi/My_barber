/** Fixed desktop sidebar width — keep in sync with Tailwind arbitrary values. */
export const DESKTOP_SIDEBAR_WIDTH_PX = 260;

export const DESKTOP_SIDEBAR_OFFSET_CLASS = "lg:pl-[260px]" as const;
export const DESKTOP_SIDEBAR_LEFT_CLASS = "lg:left-[260px]" as const;

/** Floating neo dock — content pastki padding (safe-area bilan). */
export const MOBILE_DOCK_OFFSET = "calc(5.5rem + env(safe-area-inset-bottom))" as const;

/** Sahifa kontenti uchun standart pastki padding (dock + qo'shimcha bo'shliq). */
export const MOBILE_CONTENT_PADDING_BOTTOM =
  "calc(5.5rem + env(safe-area-inset-bottom) + 0.75rem)" as const;

/** Tailwind arbitrary value sifatida ishlatish uchun. */
export const MOBILE_CONTENT_PADDING_CLASS =
  "pb-[calc(5.5rem+env(safe-area-inset-bottom)+0.75rem)]" as const;

/** Sticky action bar + dock ustidagi joy. */
export const MOBILE_STICKY_ACTIONS_OFFSET =
  "calc(5.5rem + env(safe-area-inset-bottom) + 4.25rem)" as const;
