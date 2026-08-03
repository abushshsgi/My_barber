import { Capacitor } from "@capacitor/core";
import type { RegisteredRouter } from "@tanstack/react-router";
import { navigateBack } from "@/lib/mobile-back";

/** Dock / asosiy tablar — ikkinchi back ilovani yopadi. */
const ROOT_TAB_PATHS = new Set(["/", "/map", "/explore", "/profile", "/ai-style"]);

const EXIT_WINDOW_MS = 2000;

let lastRootBackAt = 0;
let attached = false;

type BackHandler = () => boolean;

const handlers: BackHandler[] = [];

/** Sheet/dialog/kamera yopish — true qaytsa back iste'mol qilinadi. */
export function registerNativeBackHandler(handler: BackHandler): () => void {
  handlers.push(handler);
  return () => {
    const i = handlers.lastIndexOf(handler);
    if (i >= 0) handlers.splice(i, 1);
  };
}

function tryCloseOverlays(): boolean {
  for (let i = handlers.length - 1; i >= 0; i -= 1) {
    try {
      if (handlers[i]?.()) return true;
    } catch {
      /* ignore */
    }
  }

  if (typeof document !== "undefined") {
    if (document.documentElement.dataset.faceCamera === "open") {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      return true;
    }
    const openOverlay = document.querySelector(
      '[data-state="open"][role="dialog"], [data-state="open"][data-vaul-drawer]',
    );
    if (openOverlay) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      return true;
    }
  }
  return false;
}

function isRootTab(pathname: string): boolean {
  return ROOT_TAB_PATHS.has(pathname);
}

async function handleHardwareBack(router: RegisteredRouter) {
  if (tryCloseOverlays()) return;

  const pathname = router.state.location.pathname;

  if (isRootTab(pathname)) {
    const now = Date.now();
    if (now - lastRootBackAt < EXIT_WINDOW_MS) {
      lastRootBackAt = 0;
      try {
        const { App } = await import("@capacitor/app");
        await App.exitApp();
      } catch {
        /* ignore */
      }
      return;
    }
    lastRootBackAt = now;
    return;
  }

  navigateBack(router, "/");
}

export function attachNativeBackButton(router: RegisteredRouter): () => void {
  if (!Capacitor.isNativePlatform() || attached) {
    return () => undefined;
  }
  attached = true;

  let remove: (() => void) | undefined;
  void import("@capacitor/app").then(({ App }) => {
    void App.addListener("backButton", () => {
      void handleHardwareBack(router);
    }).then((handle) => {
      remove = () => handle.remove();
    });
  });

  return () => {
    attached = false;
    remove?.();
  };
}
