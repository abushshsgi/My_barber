import { Platform } from "react-native";
import type { CareShelfItem } from "../api/care";

const SHELF_NOTIF_PREFIX = "care-shelf-";

async function getNotifications(): Promise<typeof import("expo-notifications") | null> {
  if (Platform.OS === "web") return null;
  try {
    return await import("expo-notifications");
  } catch {
    return null;
  }
}

function dateAtHour(rawDate: string, hour = 9): Date | null {
  if (!rawDate) return null;
  const d = new Date(rawDate);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(hour, 0, 0, 0);
  return d;
}

function daysBefore(rawDate: string, days: number): Date | null {
  const d = dateAtHour(rawDate, 9);
  if (!d) return null;
  d.setDate(d.getDate() - days);
  return d;
}

/** Refill (<=10%) va PAO tugashidan 7 kun oldin eslatmalarni qayta-jadval qiladi. */
export async function scheduleCareShelfReminders(items: CareShelfItem[]): Promise<number> {
  const Notifications = await getNotifications();
  if (!Notifications) return 0;

  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) {
    const asked = await Notifications.requestPermissionsAsync();
    if (!asked.granted) return 0;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing
      .filter((n) => String(n.identifier || "").startsWith(SHELF_NOTIF_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  const now = new Date();
  let created = 0;

  for (const item of items.slice(0, 24)) {
    const thresholdDays = Math.max(1, Math.ceil((item.days_to_depletion || 1) * 0.1));
    const refillWarn = daysBefore(item.refill_date, thresholdDays);
    if (refillWarn && refillWarn.getTime() > now.getTime() + 60_000) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${SHELF_NOTIF_PREFIX}refill-${item.id}-${item.refill_date}`,
        content: {
          title: "Mahsulot tugamoqda",
          body: `${item.name} taxminan ${Math.max(item.estimated_days_left, 0)} kunda tugaydi. Refill qilishni unutmang.`,
          data: { type: "care_shelf_refill", itemId: item.id },
          sound: "default",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: refillWarn,
        },
      });
      created += 1;
    }

    const paoWarn = daysBefore(item.expiration_date, 7);
    if (paoWarn && paoWarn.getTime() > now.getTime() + 60_000) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${SHELF_NOTIF_PREFIX}pao-${item.id}-${item.expiration_date}`,
        content: {
          title: "PAO muddati tugamoqda",
          body: `${item.name} uchun xavfsiz ishlatish muddati 7 kundan keyin tugaydi.`,
          data: { type: "care_shelf_pao", itemId: item.id },
          sound: "default",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: paoWarn,
        },
      });
      created += 1;
    }
  }

  return created;
}
