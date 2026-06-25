import { useEffect } from "react";
import { APP_BUILD_ID } from "@/lib/app-build-id";
import { toast } from "sonner";

const CHUNK_RELOAD_KEY = "mybarber-partner-chunk-reload";
const VERSION_RELOAD_KEY = "mybarber-partner-version-reload";

function isChunkLoadError(reason: unknown): boolean {
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : "";
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed|error loading dynamically imported module/i.test(
    message,
  );
}

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
  window.location.reload();
  return true;
}

/** Deploydan keyin eski bundle hashlari 404 bo'lsa, bir marta yangilab yangi versiyani yuklaydi. */
export function DeployRecovery() {
  useEffect(() => {
    const onPreloadError = (event: Event) => {
      event.preventDefault();
      reloadOnce(CHUNK_RELOAD_KEY);
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkLoadError(event.reason)) return;
      event.preventDefault();
      reloadOnce(CHUNK_RELOAD_KEY);
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
          onClick: () => window.location.reload(),
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
