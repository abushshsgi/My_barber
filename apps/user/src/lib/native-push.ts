import { Capacitor } from "@capacitor/core";
import type { RegisteredRouter } from "@tanstack/react-router";
import { apiJson, hasValidUserSession } from "@/lib/api/client";
import { navigateFromPushPayload } from "@/lib/native-deep-links";

const TOKEN_STORAGE_KEY = "mysaloon.push.fcm_token";

let attached = false;
let registered = false;

async function registerTokenOnServer(token: string) {
  if (!hasValidUserSession()) return;
  const platform = Capacitor.getPlatform();
  await apiJson("/api/v1/notifications/push-token/", {
    method: "POST",
    body: JSON.stringify({
      token,
      platform,
      device_name: platform === "android" ? "android" : platform,
    }),
  });
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    /* noop */
  }
}

export async function unregisterPushToken(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  let token = "";
  try {
    token = localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
  } catch {
    token = "";
  }
  try {
    if (hasValidUserSession()) {
      await apiJson("/api/v1/notifications/push-token/", {
        method: "DELETE",
        body: JSON.stringify(token ? { token } : {}),
      });
    }
  } catch {
    /* best-effort */
  }
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

export async function registerPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !hasValidUserSession()) return;

  const { PushNotifications } = await import("@capacitor/push-notifications");

  const perm = await PushNotifications.checkPermissions();
  let receive = perm.receive;
  if (receive === "prompt" || receive === "prompt-with-rationale") {
    const asked = await PushNotifications.requestPermissions();
    receive = asked.receive;
  }
  if (receive !== "granted") return;

  if (Capacitor.getPlatform() === "android") {
    try {
      await PushNotifications.createChannel({
        id: "mysaloon_default",
        name: "MySaloon",
        description: "Bron, chat va hisob bildirishnomalari",
        importance: 5,
        visibility: 1,
        sound: "default",
        vibration: true,
      });
    } catch {
      /* channel may already exist */
    }
  }

  if (!registered) {
    await PushNotifications.register();
    registered = true;
  }
}

export function attachNativePush(router: RegisteredRouter): () => void {
  if (!Capacitor.isNativePlatform() || attached) {
    return () => undefined;
  }
  attached = true;

  const cleanups: Array<() => void> = [];

  void import("@capacitor/push-notifications").then(({ PushNotifications }) => {
    void PushNotifications.addListener("registration", (token) => {
      void registerTokenOnServer(token.value);
    }).then((h) => cleanups.push(() => h.remove()));

    void PushNotifications.addListener("registrationError", (err) => {
      console.warn("[push] registrationError", err.error);
    }).then((h) => cleanups.push(() => h.remove()));

    void PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data = (action.notification.data ?? {}) as Record<string, unknown>;
      navigateFromPushPayload(router, data);
    }).then((h) => cleanups.push(() => h.remove()));

    void PushNotifications.addListener("pushNotificationReceived", () => {
      window.dispatchEvent(new CustomEvent("mysaloon:push-received"));
    }).then((h) => cleanups.push(() => h.remove()));
  });

  if (hasValidUserSession()) {
    void registerPushNotifications();
  }

  const onAuth = () => {
    void registerPushNotifications();
  };
  window.addEventListener("mysaloon:auth-ready", onAuth);
  cleanups.push(() => window.removeEventListener("mysaloon:auth-ready", onAuth));

  return () => {
    attached = false;
    cleanups.forEach((fn) => fn());
  };
}
