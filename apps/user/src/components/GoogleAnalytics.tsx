import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

import { GA_ENABLED, GA_MEASUREMENT_ID, trackPageView } from "../lib/ga";

let gaLoaderStarted = false;

function loadGoogleAnalytics(): void {
  if (!GA_ENABLED || gaLoaderStarted || typeof window === "undefined") return;
  gaLoaderStarted = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

/**
 * GA loads after first paint (idle) so gtag does not compete with LCP on /ai-style.
 * SPA pageviews after the first load.
 */
export function GoogleAnalytics() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const href = useRouterState({ select: (s) => s.location.href });
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    if (!GA_ENABLED) return;

    const schedule = () => {
      const run = () => loadGoogleAnalytics();
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(run, { timeout: 5000 });
      } else {
        window.setTimeout(run, 2500);
      }
    };

    const onLoad = () => schedule();
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => window.removeEventListener("load", onLoad);
  }, []);

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
