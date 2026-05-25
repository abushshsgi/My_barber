import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

export async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#171512" });
  } catch {
    // Status bar plugin may be unavailable on some WebView builds.
  }

  try {
    await SplashScreen.hide();
  } catch {
    // Splash auto-hides on some platforms.
  }
}
