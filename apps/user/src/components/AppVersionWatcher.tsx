import { useEffect } from "react";
import { toast } from "sonner";

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

function reloadForUpdate() {
  toast.message("Yangilanmoqda...", { duration: 1200 });
  window.setTimeout(() => window.location.reload(), 350);
}

/** Deploy bo'lganda eski bundle cache'da qolgan foydalanuvchilarni avtomatik yangilaydi. */
export function AppVersionWatcher() {
  useEffect(() => {
    if (__APP_BUILD_ID__ === "dev") return;

    let reloading = false;
    const applyUpdate = () => {
      if (reloading) return;
      reloading = true;
      reloadForUpdate();
    };

    const checkVersion = async () => {
      const remote = await fetchRemoteBuildId();
      if (remote && remote !== __APP_BUILD_ID__) applyUpdate();
    };

    void checkVersion();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void checkVersion();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void checkVersion();
    };
    document.addEventListener("visibilitychange", onVisible);

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
      window.removeEventListener("vite:preloadError", onPreloadError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
