import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { APP_BUILD_ID } from "@/lib/app-build-id";

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

/** Yangi deploy bor-yo'qligini tekshiradi; avtomatik reload QILMAYDI (loop oldini olish). */
export function AppVersionWatcher() {
  const toastShown = useRef(false);

  useEffect(() => {
    if (APP_BUILD_ID === "dev") return;

    const maybeNotify = async () => {
      if (toastShown.current) return;
      const remote = await fetchRemoteBuildId();
      if (!remote || remote === APP_BUILD_ID) return;

      toastShown.current = true;
      toast.message("Yangi versiya mavjud", {
        description: "Iltimos, sahifani bir marta yangilang.",
        duration: 8000,
        action: {
          label: "Yangilash",
          onClick: () => window.location.reload(),
        },
      });
    };

    void maybeNotify();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void maybeNotify();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void maybeNotify();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
