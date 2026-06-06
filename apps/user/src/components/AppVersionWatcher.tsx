import { useEffect } from "react";
import { toast } from "sonner";
import { APP_BUILD_ID } from "@/lib/app-build-id";
import { clearClientCaches } from "@/lib/clear-client-cache";

const POLL_MS = 5 * 60 * 1000;

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

async function reloadForUpdate() {
  toast.message("Yangilanmoqda...", { duration: 1200 });
  await clearClientCaches();

  window.setTimeout(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("_v", Date.now().toString(36));
    window.location.replace(url.toString());
  }, 200);
}

/** Deploy bo'lganda eski bundle cache'da qolgan foydalanuvchilarni avtomatik yangilaydi. */
export function AppVersionWatcher() {
  useEffect(() => {
    void clearClientCaches();

    if (APP_BUILD_ID === "dev") return;

    let reloading = false;
    const applyUpdate = () => {
      if (reloading) return;
      reloading = true;
      void reloadForUpdate();
    };

    const checkVersion = async () => {
      try {
        const remote = await fetchRemoteBuildId();
        if (remote && remote !== APP_BUILD_ID) applyUpdate();
      } catch {
        // ignore network errors
      }
    };

    void checkVersion();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void checkVersion();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void checkVersion();
    };
    document.addEventListener("visibilitychange", onVisible);

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void checkVersion();
    };
    window.addEventListener("pageshow", onPageShow);

    const onPreloadError = (event: Event) => {
      event.preventDefault();
      applyUpdate();
    };
    window.addEventListener("vite:preloadError", onPreloadError);

    const onRejection = (event: PromiseRejectionEvent) => {
      const msg = String(event.reason?.message ?? event.reason ?? "");
      if (/Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg)) {
        event.preventDefault();
        applyUpdate();
      }
    };
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("vite:preloadError", onPreloadError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
