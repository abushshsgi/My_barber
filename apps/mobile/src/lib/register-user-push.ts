import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiJson } from "../api/client";
import { emitWalletTopUp } from "./wallet-topup-live";

type PushData = Record<string, unknown>;

function projectId(): string {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId || Constants.easConfig?.projectId || "";
}

function readData(raw: unknown): PushData {
  if (!raw || typeof raw !== "object") return {};
  return raw as PushData;
}

function publishTopUp(seen: Set<string>, data: PushData) {
  if (String(data.type || "") !== "wallet_topup") return;
  const depositId = String(data.deposit_id || data.entry_id || "");
  if (!depositId || seen.has(depositId)) return;
  seen.add(depositId);
  emitWalletTopUp({ depositId, amount: String(data.amount || "") });
}

/** Ilova yopiq bo'lsa ham tizim pushi uchun Expo token. OTP emas. */
export async function startUserPush(seen: Set<string>): Promise<() => void> {
  if (Platform.OS === "web") return () => {};
  let Notifications: typeof import("expo-notifications");
  try {
    Notifications = await import("expo-notifications");
  } catch {
    return () => {};
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("wallet", {
      name: "Hamyon",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  const id = projectId();
  if (granted && id) {
    try {
      const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
      if (token.startsWith("ExponentPushToken")) {
        await apiJson("/api/v1/notifications/push-token/", {
          method: "POST",
          body: JSON.stringify({ token, platform: Platform.OS }),
        });
      }
    } catch {
      /* simulyator yoki ruxsat yo'q */
    }
  }

  const last = await Notifications.getLastNotificationResponseAsync();
  if (last) publishTopUp(seen, readData(last.notification.request.content.data));
  await Notifications.clearLastNotificationResponseAsync();

  const received = Notifications.addNotificationReceivedListener((notification) => {
    publishTopUp(seen, readData(notification.request.content.data));
  });
  const opened = Notifications.addNotificationResponseReceivedListener((response) => {
    publishTopUp(seen, readData(response.notification.request.content.data));
  });

  return () => {
    received.remove();
    opened.remove();
  };
}
