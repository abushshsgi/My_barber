import { Capacitor } from "@capacitor/core";
import type { RegisteredRouter } from "@tanstack/react-router";
import { attachNativeBackButton } from "@/lib/native-back";
import { attachNativeDeepLinks } from "@/lib/native-deep-links";
import { attachNativePush } from "@/lib/native-push";

let shellReady = false;

async function configureChrome() {
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    // Style.Light = qora ikonkalar (och fon / auth). Style.Dark = oq ikonkalar (to‘q fon).
    try {
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setStyle({ style: Style.Light });
    } catch {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: "#ffffff" });
    }
  } catch {
    /* Status bar plugin may be unavailable */
  }

  try {
    const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard");
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  } catch {
    /* Keyboard plugin optional on some builds */
  }

  // SplashScreen.hide — NativeBootSplash qiladi (flash oldini olish).
}

/** StatusBar / Keyboard — router oldidan. Splash React intro yashiradi. */
export async function initNativeShell() {
  if (!Capacitor.isNativePlatform() || shellReady) return;
  shellReady = true;
  await configureChrome();
}

/** Hardware back, deep link, push, appState — router bilan. */
export function attachNativeAppBridge(router: RegisteredRouter): () => void {
  if (!Capacitor.isNativePlatform()) return () => undefined;

  const cleanups = [
    attachNativeBackButton(router),
    attachNativeDeepLinks(router),
    attachNativePush(router),
  ];

  let removeState: (() => void) | undefined;
  void import("@capacitor/app").then(({ App }) => {
    void App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) return;
      window.dispatchEvent(new CustomEvent("mysaloon:app-foreground"));
    }).then((h) => {
      removeState = () => h.remove();
    });
  });

  return () => {
    cleanups.forEach((fn) => fn());
    removeState?.();
  };
}
