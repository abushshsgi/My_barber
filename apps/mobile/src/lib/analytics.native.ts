import { Platform } from "react-native";

/** Hozir faqat Android — iOS uchun GoogleService-Info.plist kerak. */
const ENABLED = Platform.OS === "android";

async function analyticsModule() {
  if (!ENABLED) return null;
  try {
    const mod = await import("@react-native-firebase/analytics");
    return mod.default();
  } catch (err) {
    if (__DEV__) console.warn("[analytics] native modul yuklanmadi", err);
    return null;
  }
}

export async function logEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): Promise<void> {
  const analytics = await analyticsModule();
  if (!analytics) return;
  try {
    await analytics.logEvent(name, params);
  } catch (err) {
    if (__DEV__) console.warn("[analytics] logEvent", name, err);
  }
}

export async function logAppOpen(): Promise<void> {
  const analytics = await analyticsModule();
  if (!analytics) return;
  try {
    await analytics.logAppOpen();
  } catch (err) {
    if (__DEV__) console.warn("[analytics] logAppOpen", err);
  }
}

/** GA4 recommended: yangi → sign_up, mavjud → login. */
export function trackAuthSuccess(opts: {
  isNewUser: boolean;
  method: "google" | "phone" | "password";
}): void {
  void logEvent(opts.isNewUser ? "sign_up" : "login", { method: opts.method });
}

export function trackScreenView(screenName: string): void {
  void (async () => {
    const analytics = await analyticsModule();
    if (!analytics) return;
    try {
      await analytics.logScreenView({
        screen_name: screenName,
        screen_class: screenName,
      });
    } catch (err) {
      if (__DEV__) console.warn("[analytics] screen", screenName, err);
    }
  })();
}
