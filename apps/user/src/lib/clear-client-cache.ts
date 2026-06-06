/** Eski PWA/service worker va brauzer cache qoldiqlarini tozalaydi. */
export async function clearClientCaches() {
  if (typeof window === "undefined") return;

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  if ("indexedDB" in window && typeof indexedDB.databases === "function") {
    try {
      const databases = await indexedDB.databases();
      await Promise.all(
        databases.map((database) => {
          if (!database.name) return Promise.resolve();
          return new Promise<void>((resolve) => {
            const request = indexedDB.deleteDatabase(database.name!);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          });
        }),
      );
    } catch {
      // ignore unsupported browsers
    }
  }
}
