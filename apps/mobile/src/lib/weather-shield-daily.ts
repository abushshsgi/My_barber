import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { WeatherData } from "../types/weatherShield";
import { generateDailyWeatherPushPayload } from "../services/notificationService";
import { ensureCareNotificationPermission } from "./care-reminders";

const DONE_STORE_KEY = "mysaloon.morphAi.weatherShieldDone.v2";
const SHIELD_NOTIF_PREFIX = "weather-shield-daily-";

export function localDayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type DoneStore = { day: string; ids: string[] };

/** Bugungi bajarilgan tavsiyalar — yangi kunda bo‘sh. */
export async function loadTodayShieldDone(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(DONE_STORE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as DoneStore;
    if (!parsed?.day || !Array.isArray(parsed.ids)) return new Set();
    if (parsed.day !== localDayKey()) return new Set();
    return new Set(parsed.ids.filter((id) => typeof id === "string"));
  } catch {
    return new Set();
  }
}

export async function saveTodayShieldDone(ids: Set<string>): Promise<void> {
  const payload: DoneStore = { day: localDayKey(), ids: [...ids] };
  await AsyncStorage.setItem(DONE_STORE_KEY, JSON.stringify(payload)).catch(() => undefined);
}

async function getNotifications(): Promise<typeof import("expo-notifications") | null> {
  if (Platform.OS === "web") return null;
  try {
    return await import("expo-notifications");
  } catch {
    return null;
  }
}

/**
 * Har kuni ertalab 08:00 va kechqurun 18:30 — ob-havoga qarab soch himoyasi eslatmasi.
 * App ochilganda / ob-havo yangilanganda qayta yoziladi.
 */
export async function scheduleDailyWeatherShieldReminders(opts: {
  weather: WeatherData;
  pendingCount?: number;
}): Promise<number> {
  const Notifications = await getNotifications();
  if (!Notifications) return 0;

  const granted = await ensureCareNotificationPermission();
  if (!granted) return 0;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => String(n.identifier || "").startsWith(SHIELD_NOTIF_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("weather-shield", {
        name: "Morf Shield",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#C6EF4A",
      });
    } catch {
      /* optional */
    }
  }

  const morning = generateDailyWeatherPushPayload(opts.weather);
  const pending = opts.pendingCount ?? 0;
  const eveningBody =
    pending > 0
      ? `Bugun hali ${pending} ta soch himoyasi qoldi — Morf Shield da galochka bosing.`
      : "Ertaga ham ob-havoga qarab yangi tavsiyalar chiqadi. Sochingizni himoya qiling ✨";

  const slots: { id: string; hour: number; minute: number; title: string; body: string }[] = [
    {
      id: "morning",
      hour: 8,
      minute: 0,
      title: morning.title,
      body: morning.body,
    },
    {
      id: "evening",
      hour: 18,
      minute: 30,
      title: "Morf Shield · kunlik checklist",
      body: eveningBody,
    },
  ];

  let created = 0;
  for (const slot of slots) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `${SHIELD_NOTIF_PREFIX}${slot.id}`,
        content: {
          title: slot.title,
          body: slot.body,
          data: {
            type: "weather_shield_daily",
            threat: morning.threat,
            screen: "CareWeather",
          },
          sound: "default",
          ...(Platform.OS === "android" ? { channelId: "weather-shield" } : null),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: slot.hour,
          minute: slot.minute,
        },
      });
      created += 1;
    } catch {
      try {
        const when = new Date();
        when.setHours(slot.hour, slot.minute, 0, 0);
        if (when.getTime() <= Date.now() + 60_000) {
          when.setDate(when.getDate() + 1);
        }
        await Notifications.scheduleNotificationAsync({
          identifier: `${SHIELD_NOTIF_PREFIX}${slot.id}`,
          content: {
            title: slot.title,
            body: slot.body,
            data: {
              type: "weather_shield_daily",
              threat: morning.threat,
              screen: "CareWeather",
            },
            sound: "default",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: when,
          },
        });
        created += 1;
      } catch {
        /* ignore */
      }
    }
  }

  return created;
}
