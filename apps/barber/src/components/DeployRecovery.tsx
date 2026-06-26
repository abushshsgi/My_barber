import { useEffect } from "react";
import { APP_BUILD_ID } from "@/lib/app-build-id";
import { isChunkLoadError, reloadForChunkError } from "@/lib/chunk-reload";
import { toast } from "sonner";

const VERSION_RELOAD_KEY = "mybarber-partner-version-reload";

async function fetchRemoteBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { buildId?: string };
    return data.buildId ?? null;
  } catch {
    return null;
  }
}

function reloadOnce(storageKey: string) {
  if (sessionStorage.getItem(storageKey)) return false;
  sessionStorage.setItem(storageKey, "1");
  const url = new URL(window.location.href);
  url.searchParams.set("_v", Date.now().toString(36));
  window.location.replace(url.toString());
  return true;
}

/** Deploydan keyin eski bundle hashlari 404 bo'lsa, bir marta yangilab yangi versiyani yuklaydi. */
export function DeployRecovery() {
  useEffect(() => {
    const onPreloadError = (event: Event) => {
      event.preventDefault();
      reloadForChunkError();
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkLoadError(event.reason)) return;
      event.preventDefault();
      reloadForChunkError();
    };

    window.addEventListener("vite:preloadError", onPreloadError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("vite:preloadError", onPreloadError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    if (APP_BUILD_ID === "dev") return;

    const syncVersion = async () => {
      const remote = await fetchRemoteBuildId();
      if (!remote || remote === APP_BUILD_ID) return;

      if (reloadOnce(VERSION_RELOAD_KEY)) return;

      toast.message("Yangi versiya mavjud", {
        description: "Iltimos, sahifani bir marta yangilang.",
        duration: 8000,
        action: {
          label: "Yangilash",
          onClick: () => {
            const url = new URL(window.location.href);
            url.searchParams.set("_v", Date.now().toString(36));
            window.location.replace(url.toString());
          },
        },
      });
    };

    void syncVersion();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void syncVersion();
    }, 5 * 60 * 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") void syncVersion();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
