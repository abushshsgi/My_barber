import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { installSiteTelemetry, trackSiteEvent } from "@/lib/site-telemetry";

export function SiteTelemetry() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => installSiteTelemetry(), []);

  useEffect(() => {
    trackSiteEvent("page", pathname, document.title);
  }, [pathname]);

  return null;
}
