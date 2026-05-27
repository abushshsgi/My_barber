export const USER_PREFS_STORAGE_KEY = "mybarber_user_preferences";
export const USER_PREFS_CHANGED_EVENT = "mybarber-user-prefs-changed";

export type UserPreferences = {
  bookingReminders: boolean;
  chatAlerts: boolean;
  reduceMotion: boolean;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  bookingReminders: true,
  chatAlerts: true,
  reduceMotion: false,
};

export function readUserPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_USER_PREFERENCES;
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(USER_PREFS_STORAGE_KEY) || "{}",
    ) as Partial<UserPreferences>;
    return { ...DEFAULT_USER_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_USER_PREFERENCES;
  }
}

export function writeUserPreferences(prefs: UserPreferences): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent(USER_PREFS_CHANGED_EVENT, { detail: prefs }));
}

export function applyReduceMotion(enabled?: boolean): void {
  if (typeof document === "undefined") return;
  const on = enabled ?? readUserPreferences().reduceMotion;
  document.documentElement.classList.toggle("reduce-motion", on);
}

export function areBookingRemindersEnabled(): boolean {
  return readUserPreferences().bookingReminders;
}

export function areChatAlertsEnabled(): boolean {
  return readUserPreferences().chatAlerts;
}

export function areNotificationAlertsEnabled(prefs?: UserPreferences): boolean {
  const p = prefs ?? readUserPreferences();
  return p.bookingReminders || p.chatAlerts;
}

export function isChatNotificationType(type: string): boolean {
  return type === "chat_message";
}

export function notificationPassesPrefs(type: string, prefs?: UserPreferences): boolean {
  const p = prefs ?? readUserPreferences();
  if (isChatNotificationType(type)) return p.chatAlerts;
  return p.bookingReminders;
}
