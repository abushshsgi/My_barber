import { hasStoredUserCredential } from "@/lib/api/client";
import { isPublicCatalogShellPath } from "@/lib/public-shell-paths";

declare global {
  interface Window {
    __MYSALOON_PUBLIC_ROUTER__?: boolean;
  }
}

export function markPublicBootstrapActive(): void {
  if (typeof window === "undefined") return;
  window.__MYSALOON_PUBLIC_ROUTER__ = true;
}

export function isPublicBootstrapActive(): boolean {
  return typeof window !== "undefined" && window.__MYSALOON_PUBLIC_ROUTER__ === true;
}

/** Mehmon public routerdan boshqa marshrutga o'tganda to'liq manifest bilan qayta yuklash. */
export function promoteToFullAppDocument(targetHref?: string): void {
  const href = targetHref ?? window.location.href;
  void import("../router.app").finally(() => {
    window.location.assign(href);
  });
}

/** Guest Explore first paint — minimal router manifest, not the full route tree. */
export function shouldUsePublicRouterBootstrap(pathname?: string): boolean {
  if (typeof window === "undefined") return false;
  const path = pathname ?? window.location.pathname;
  return isPublicCatalogShellPath(path) && !hasStoredUserCredential();
}

export function scheduleFullRouterPreload(): void {
  if (typeof window === "undefined") return;
  const preload = () => {
    void import("../router.app");
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(preload, { timeout: 4000 });
    return;
  }
  window.setTimeout(preload, 2000);
}