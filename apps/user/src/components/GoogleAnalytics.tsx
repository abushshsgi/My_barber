import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

import { GA_ENABLED, trackPageView } from "../lib/ga";

/**
 * SPA pageviews after the first load.
 * Initial page_view comes from gtag('config') in RootShell (so GA "check tag" sees a hit).
 */
export function GoogleAnalytics() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const href = useRouterState({ select: (s) => s.location.href });
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    if (!GA_ENABLED) return;
    const path =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : pathname;
    if (prevPath.current === null) {
      prevPath.current = path;
      return;
    }
    if (prevPath.current === path) return;
    prevPath.current = path;
    trackPageView(path);
  }, [pathname, href]);

  return null;
}
