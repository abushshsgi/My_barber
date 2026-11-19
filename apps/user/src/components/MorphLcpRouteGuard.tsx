import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { pathUsesMorphStaticLcp, removeMorphLcpStatic } from "@/lib/morph-lcp-static";

/** Removes SSR try-on hero overlay when leaving /ai-style. */
export function MorphLcpRouteGuard() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!pathUsesMorphStaticLcp(pathname)) removeMorphLcpStatic();
  }, [pathname]);

  return null;
}