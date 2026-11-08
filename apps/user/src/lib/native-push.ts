import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { apiJson, hasValidUserSession } from "@/lib/api/client";
import { getFirebaseApp } from "@/lib/firebase";

const VAPID =
  (
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.VITE_FIREBASE_VAPID_KEY || ""
  ).trim();

async function postPushToken(token: string): Promise<void> {
  await apiJson("/api/v1/notifications/push-token/", {
    method: "POST",
    body: JSON.stringify({
      token,
      platform: "web",
      device_name: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : "web",
    }),
  });
}

/** Brauzerda ruxsat berilgan bo‘lsa FCM token yuboradi. Ruxsat so‘ramaydi. */
export async function registerPushNotifications(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!hasValidUserSession()) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (!VAPID) return;
  try {
    const ok = await isSupported();
    if (!ok) return;
    const app = getFirebaseApp();
    if (!app) return;
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID, serviceWorkerRegistration: registration });
    if (token) await postPushToken(token);
  } catch {
    /* ruxsat/token yo‘q — inbox ishlayveradi */
  }
}

/** Bildirishnomalar sahifasidan: ruxsat so‘rash + token. */
export async function enableWebPush(): Promise<"granted" | "denied" | "default" | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const perm =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (perm === "granted") await registerPushNotifications();
  return perm;
}

export async function unregisterPushToken(): Promise<void> {
  if (!hasValidUserSession()) return;
  try {
    await apiJson("/api/v1/notifications/push-token/", { method: "DELETE" });
  } catch {
    /* noop */
  }
}
