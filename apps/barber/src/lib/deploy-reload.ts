const BUILD_STORAGE_KEY = "mysaloon-partner-app-build";

export async function purgeDeployCaches(): Promise<void> {
  const tasks: Promise<unknown>[] = [];
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    tasks.push(
      navigator.serviceWorker.getRegistrations().then((regs) =>
        Promise.all(regs.map((r) => r.unregister())),
      ),
    );
  }
  if (typeof window !== "undefined" && "caches" in window) {
    tasks.push(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
  await Promise.all(tasks);
}

/** Deploydan keyin SW/cache tozalab yangi bundle yuklash. */
export function hardReloadForDeploy(): void {
  if (typeof window === "undefined") return;

  void purgeDeployCaches().finally(() => {
    try {
      // Remote build id yozmaymiz — aks holda eski bundle boot scripti cheksiz reload qiladi.
      localStorage.removeItem(BUILD_STORAGE_KEY);
    } catch {
      /* ignore quota / private mode */
    }

    const url = new URL(window.location.href);
    for (const key of ["_v", "_chunk", "_deploy", "_boot"]) {
      url.searchParams.delete(key);
    }
    url.searchParams.set("_deploy", Date.now().toString(36));
    window.location.replace(url.toString());
  });
}

export function versionToastShownKey(remoteBuildId: string): string {
  return `mybarber-partner-version-toast-${remoteBuildId}`;
}

export function versionToastDismissedKey(remoteBuildId: string): string {
  return `mybarber-partner-version-dismissed-${remoteBuildId}`;
}
