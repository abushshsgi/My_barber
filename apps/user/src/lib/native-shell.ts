import { Capacitor } from "@capacitor/core";
import type { RegisteredRouter } from "@tanstack/react-router";
import { attachNativeBackButton } from "@/lib/native-back";
import { attachNativeDeepLinks } from "@/lib/native-deep-links";
import { attachNativePush } from "@/lib/native-push";

let shellReady = false;

async function hideNativeSplash() {
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch {
    /* optional */
  }
}

async function configureChrome() {
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    // Style.Light = qora ikonkalar (och fon).
    try {
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: "#ffffff" });
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
}

/** StatusBar / Keyboard / Splash hide — darhol, qorong‘i ekran qotib qolmasin. */
export async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;
  // Splashni birinchi yashiramiz — keyin chrome.
  await hideNativeSplash();
  if (shellReady) return;
  shellReady = true;
  await configureChrome();
  // Ikkinchi marta (race) — ba'zi qurilmalarda hide kechikadi.
  await hideNativeSplash();
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
