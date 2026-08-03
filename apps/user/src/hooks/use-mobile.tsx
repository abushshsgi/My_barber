import * as React from "react";

/** Tailwind `lg` — UserLayout, DesktopPageSplit va dialog/sheet tanlovi bilan bir xil. */
export const LG_BREAKPOINT = 1024;

export function useIsLgUp() {
  // SSR va hydration bir xil bo'lishi uchun dastlab false; keyin clientda o'lchanadi.
  const [isLgUp, setIsLgUp] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`);
    const onChange = () => setIsLgUp(mql.matches);
    mql.addEventListener("change", onChange);
    setIsLgUp(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isLgUp;
}

/** `lg` dan past — mobil layout / Drawer (Dialog emas). */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${LG_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
