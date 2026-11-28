import { useSyncExternalStore } from "react";

/** Tailwind `lg` — UserLayout, DesktopPageSplit va dialog/sheet tanlovi bilan bir xil. */
export const LG_BREAKPOINT = 1024;
/** Explore detail va boshqa `md` split. */
export const MD_BREAKPOINT = 768;

function noopSubscribe() {
  return () => undefined;
}

function subscribeMedia(query: string) {
  return (onStoreChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onStoreChange);
    return () => mql.removeEventListener("change", onStoreChange);
  };
}

function readMedia(query: string): boolean {
  return window.matchMedia(query).matches;
}

function useMediaQuery(query: string, serverDefault = false): boolean {
  return useSyncExternalStore(
    typeof window === "undefined" ? noopSubscribe : subscribeMedia(query),
    typeof window === "undefined" ? () => serverDefault : () => readMedia(query),
    () => serverDefault,
  );
}

/**
 * `lg` va undan katta — birinchi client paintda `matchMedia` (useEffect kechikishi yo‘q, CLS kamayadi).
 */
export function useIsLgUp() {
  return useMediaQuery(`(min-width: ${LG_BREAKPOINT}px)`);
}

/** `lg` dan past — mobil layout / Drawer (Dialog emas). */
export function useIsMobile() {
  return useMediaQuery(`(max-width: ${LG_BREAKPOINT - 1}px)`);
}

/** `md` va undan katta (explore detail desktop). */
export function useIsMdUp() {
  return useMediaQuery(`(min-width: ${MD_BREAKPOINT}px)`);
}