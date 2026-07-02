import * as React from "react";

const MOBILE_BREAKPOINT = 768;
/** Tailwind `lg` — UserLayout va DesktopPageSplit bilan bir xil. */
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

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
