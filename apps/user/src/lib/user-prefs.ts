const PREFS_PREFIX = "mysaloon.prefs";
const AUDIENCE_PREFIX = "mysaloon.audience";
const NOTIF_PREFS_PREFIX = "mysaloon.notif.prefs";
const LEGACY_PREFS_KEY = "mysaloon.prefs";
const LEGACY_AUDIENCE_KEY = "mysaloon.audience";
const LEGACY_NOTIF_PREFS_KEY = "mysaloon.notif.prefs";
const LEGACY_PREFS_MIGRATED_FLAG = "mysaloon.prefs.legacyMigrated";

export function prefsKey(userId: number) {
  return `${PREFS_PREFIX}:${userId}`;
}

export function audienceKey(userId: number) {
  return `${AUDIENCE_PREFIX}:${userId}`;
}

export function notifPrefsKey(userId: number) {
  return `${NOTIF_PREFS_PREFIX}:${userId}`;
}

function migrateLegacyPrefs(userId: number) {
  try {
    if (localStorage.getItem(LEGACY_PREFS_MIGRATED_FLAG)) return;

    const scopedPrefs = prefsKey(userId);
    if (!localStorage.getItem(scopedPrefs)) {
      const legacyPrefs = localStorage.getItem(LEGACY_PREFS_KEY);
      if (legacyPrefs) localStorage.setItem(scopedPrefs, legacyPrefs);
    }

    const scopedAudience = audienceKey(userId);
    if (!localStorage.getItem(scopedAudience)) {
      const legacyAudience = localStorage.getItem(LEGACY_AUDIENCE_KEY);
      if (legacyAudience) localStorage.setItem(scopedAudience, legacyAudience);
    }

    const scopedNotif = notifPrefsKey(userId);
    if (!localStorage.getItem(scopedNotif)) {
      const legacyNotif = localStorage.getItem(LEGACY_NOTIF_PREFS_KEY);
      if (legacyNotif) localStorage.setItem(scopedNotif, legacyNotif);
    }

    localStorage.removeItem(LEGACY_PREFS_KEY);
    localStorage.removeItem(LEGACY_AUDIENCE_KEY);
    localStorage.removeItem(LEGACY_NOTIF_PREFS_KEY);
    localStorage.setItem(LEGACY_PREFS_MIGRATED_FLAG, "1");
  } catch {
    /* noop */
  }
}

export function prepareUserPrefsStorageForUser(userId: number) {
  migrateLegacyPrefs(userId);
}

export function readScopedPrefsRaw(userId: number): string | null {
  try {
    return localStorage.getItem(prefsKey(userId));
  } catch {
    return null;
  }
}

export function writeScopedPrefsRaw(userId: number, raw: string) {
  try {
    localStorage.setItem(prefsKey(userId), raw);
  } catch {
    /* noop */
  }
}

export function readScopedAudience(userId: number): string | null {
  try {
    return localStorage.getItem(audienceKey(userId));
  } catch {
    return null;
  }
}

export function writeScopedAudience(userId: number, value: string) {
  try {
    localStorage.setItem(audienceKey(userId), value);
  } catch {
    /* noop */
  }
}

export function readScopedNotifPrefsRaw(userId: number): string | null {
  try {
    return localStorage.getItem(notifPrefsKey(userId));
  } catch {
    return null;
  }
}

export function writeScopedNotifPrefsRaw(userId: number, raw: string) {
  try {
    localStorage.setItem(notifPrefsKey(userId), raw);
  } catch {
    /* noop */
  }
}

export const AUDIENCE_RESET_EVENT = "mysaloon:audience-reset";

export function notifyAudienceReset(userId: number | null) {
  window.dispatchEvent(new CustomEvent(AUDIENCE_RESET_EVENT, { detail: userId }));
}
