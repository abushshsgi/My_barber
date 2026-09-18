import { Platform } from "react-native";
import type { AiCarePlanTask } from "../api/care";

const CARE_NOTIF_PREFIX = "care-routine-";

type ReminderStep = {
  id: string;
  title: string;
  time?: string;
  productName?: string;
};

function parseClock(time?: string): { h: number; m: number } | null {
  if (!time) return null;
  const m = time.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return { h, m: min };
}

function firstName(name?: string | null): string {
  const n = (name || "").trim();
  if (!n) return "Do‘stim";
  return n.split(/\s+/)[0] || "Do‘stim";
}

/** Marketing reminder copy — personal + soft FOMO. */
export function buildCareReminderCopy(
  userName: string | null | undefined,
  step: ReminderStep,
): { title: string; body: string } {
  const name = firstName(userName);
  const product = step.productName ? ` «${step.productName}»` : "";
  const clock = step.time ? `${step.time} · ` : "";
  const variants = [
    {
      title: `${name}, sochlaringiz sizni kutmoqda ✨`,
      body: `${clock}Parvarish vaqti!${product} bilan 2–3 daqiqada porloq soch — unutmang.`,
    },
    {
      title: `${name}, unutdingizmi? 💫`,
      body: `Hozir ${step.title.toLowerCase()} qilish vaqti.${product} tayyor — ritualingizni davom ettiring.`,
    },
    {
      title: `${name}, go‘zallik rituali chaqiryapti`,
      body: `${clock}${step.title}.${product} bilan bugungi qadamni yakunlang — sochingiz minnatdor bo‘ladi!`,
    },
    {
      title: `${name}, 1 daqiqa — katta farq 🌿`,
      body: `Soch parvarishi eslatmasi:${product || " mahsulotingiz"} · ${step.title}. Hozir qilganda, ertaga ko‘rinadi.`,
    },
  ];
  const idx = Math.abs(step.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % variants.length;
  return variants[idx];
}

async function getNotifications(): Promise<typeof import("expo-notifications") | null> {
  if (Platform.OS === "web") return null;
  try {
    return await import("expo-notifications");
  } catch {
    return null;
  }
}

export async function ensureCareNotificationPermission(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Mysaloon",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2EE6A8",
      });
    } catch {
      /* channel optional on older devices */
    }
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return !!asked.granted;
}

/** Cancel previous care reminders and schedule today's morning+evening steps. */
export async function scheduleCareReminders(opts: {
  userName?: string | null;
  morning?: AiCarePlanTask[];
  evening?: AiCarePlanTask[];
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

  // Cancel old care notifications
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => String(n.identifier || "").startsWith(CARE_NOTIF_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  const steps: ReminderStep[] = [...(opts.morning || []), ...(opts.evening || [])]
    .filter((t) => t?.id && (t.time || t.time_hint))
    .map((t) => ({
      id: t.id,
      title: t.title,
      time: t.time || t.time_hint,
      productName: t.product_name || undefined,
    }));

  const now = new Date();
  let created = 0;

  for (const step of steps.slice(0, 8)) {
    const clock = parseClock(step.time);
    if (!clock) continue;
    const copy = buildCareReminderCopy(opts.userName, step);
    const content = {
      title: copy.title,
      body: copy.body,
      data: { type: "care_routine", taskId: step.id },
      sound: "default" as const,
    };
    try {
      // Daily repeating reminder at step clock (fallback: next DATE).
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: `${CARE_NOTIF_PREFIX}${step.id}`,
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: clock.h,
            minute: clock.m,
          },
        });
      } catch {
        const when = new Date(now);
        when.setHours(clock.h, clock.m, 0, 0);
        if (when.getTime() <= now.getTime() + 60_000) {
          when.setDate(when.getDate() + 1);
        }
        await Notifications.scheduleNotificationAsync({
          identifier: `${CARE_NOTIF_PREFIX}${step.id}`,
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: when,
          },
        });
      }
      created += 1;
    } catch {
      // ignore single failures
    }
  }

  return created;
}
