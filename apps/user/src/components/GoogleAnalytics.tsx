import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

import { GA_ENABLED, trackPageView } from "../lib/ga";

/** SPA pageviews — gtag bootstrap lives in RootShell `<head>`. */
export function GoogleAnalytics() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const href = useRouterState({ select: (s) => s.location.href });

  useEffect(() => {
    if (!GA_ENABLED) return;
    const path =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : pathname;
    trackPageView(path);
  }, [pathname, href]);

  return null;
}
