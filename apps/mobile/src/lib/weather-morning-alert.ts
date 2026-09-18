import { Platform } from "react-native";
import type { WeatherTomorrowAlert } from "../api/weather";

const WEATHER_NOTIF_ID = "care-weather-morning-v1";

async function getNotifications(): Promise<typeof import("expo-notifications") | null> {
  if (Platform.OS === "web") return null;
  try {
    return await import("expo-notifications");
  } catch {
    return null;
  }
}

/** Ertaga yomg'ir/quruq bo'lsa — ertalab 07:30 local push. */
export async function scheduleWeatherMorningAlert(
  alert: WeatherTomorrowAlert | null | undefined,
): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications || !alert?.title) return false;

  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted) {
    const asked = await Notifications.requestPermissionsAsync();
    granted = !!asked.granted;
  }
  if (!granted) return false;

  try {
    await Notifications.cancelScheduledNotificationAsync(WEATHER_NOTIF_ID);
  } catch {
    /* ok */
  }

  const when = new Date();
  when.setDate(when.getDate() + 1);
  when.setHours(7, 30, 0, 0);

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: WEATHER_NOTIF_ID,
      content: {
        title: alert.title,
        body: alert.body,
        data: { type: "weather_morning", kind: alert.kind, screen: "CareWeather" },
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
      },
    });
    return true;
  } catch {
    return false;
  }
}
