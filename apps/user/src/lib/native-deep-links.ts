import { Capacitor } from "@capacitor/core";
import type { RegisteredRouter } from "@tanstack/react-router";
import { resolveNotificationDeepLink } from "@/lib/notification-links";

const APP_HOSTS = new Set(["www.mysaloon.uz", "mysaloon.uz", "localhost"]);

let attached = false;

function pathFromAppUrl(url: string): string | null {
  try {
    if (url.startsWith("uz.mysaloon.app://")) {
      const rest = url.replace(/^uz\.mysaloon\.app:\/\//, "");
      const path = rest.startsWith("/") ? rest : `/${rest}`;
      return path || "/";
    }
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      if (!APP_HOSTS.has(parsed.hostname) && !parsed.hostname.endsWith(".mysaloon.uz")) {
        return null;
      }
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
    }
  } catch {
    return null;
  }
  return null;
}

export function navigateToAppPath(router: RegisteredRouter, path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  void router.navigate({ to: clean as never });
}

/** Push payload yoki URL dan ichki route. */
export function navigateFromPushPayload(
  router: RegisteredRouter,
  data: Record<string, unknown> | undefined,
) {
  const link = resolveNotificationDeepLink(data);
  if (link) {
    navigateToAppPath(router, link);
    return;
  }
  void router.navigate({ to: "/notifications" });
}

export function attachNativeDeepLinks(router: RegisteredRouter): () => void {
  if (!Capacitor.isNativePlatform() || attached) {
    return () => undefined;
  }
  attached = true;

  let remove: (() => void) | undefined;
  void import("@capacitor/app").then(({ App }) => {
    void App.addListener("appUrlOpen", (event) => {
      const path = pathFromAppUrl(event.url);
      if (path) navigateToAppPath(router, path);
    }).then((handle) => {
      remove = () => handle.remove();
    });

    void App.getLaunchUrl().then((result) => {
      if (!result?.url) return;
      const path = pathFromAppUrl(result.url);
      if (path && path !== "/" && path !== router.state.location.pathname) {
        navigateToAppPath(router, path);
      }
    });
  });

  return () => {
    attached = false;
    remove?.();
  };
}
