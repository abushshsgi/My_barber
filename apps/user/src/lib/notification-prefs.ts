import type { NotifRow } from "@/lib/notifications-queries";
import {
  notificationPassesPrefs,
  type UserPreferences,
} from "./user-preferences";

export function filterNotificationsByPrefs(
  notifications: NotifRow[],
  prefs: UserPreferences,
): NotifRow[] {
  return notifications.filter((n) => notificationPassesPrefs(n.type, prefs));
}

export function unreadNotificationCount(
  notifications: NotifRow[],
  prefs: UserPreferences,
): number {
  return filterNotificationsByPrefs(notifications, prefs).filter((n) => !n.read_at).length;
}
