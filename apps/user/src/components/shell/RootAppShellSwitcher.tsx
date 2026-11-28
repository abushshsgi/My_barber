import { lazy, Suspense, useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { hasStoredUserCredential } from "@/lib/api/client";
import { isPublicCatalogShellPath } from "@/lib/public-shell-paths";
import { PublicCatalogShell } from "./PublicCatalogShell";

const InteractiveAppShell = lazy(() => import("./InteractiveAppShell"));

function readExploreLightShell(): boolean {
  if (typeof window === "undefined") return false;
  return isPublicCatalogShellPath(window.location.pathname) && !hasStoredUserCredential();
}

/**
 * Birinchi paint uchun sinxron yo'nalish (hydration mos).
 * Explore + mehmon → yengil shell; aks holda lazy interactive chunk.
 */
export function RootAppShellSwitcher() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [lightExplore, setLightExplore] = useState(readExploreLightShell);

  useEffect(() => {
    const nextLight =
      isPublicCatalogShellPath(pathname) && !hasStoredUserCredential();
    setLightExplore(nextLight);
  }, [pathname]);

  useEffect(() => {
    const promote = () => {
      if (hasStoredUserCredential()) setLightExplore(false);
    };
    window.addEventListener("mysaloon:auth-ready", promote);
    window.addEventListener("storage", promote);
    return () => {
      window.removeEventListener("mysaloon:auth-ready", promote);
      window.removeEventListener("storage", promote);
    };
  }, []);

  useEffect(() => {
    if (!lightExplore) return;
    const preload = () => {
      void import("./InteractiveAppShell");
    };
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(preload, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(preload, 2500);
    return () => window.clearTimeout(t);
  }, [lightExplore]);

  if (lightExplore) {
    return <PublicCatalogShell />;
  }

  return (
    <Suspense
      fallback={
        <PublicCatalogShell />
      }
    >
      <InteractiveAppShell />
    </Suspense>
  );
}