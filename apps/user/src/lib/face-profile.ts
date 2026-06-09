import type { FaceShapeKey, HairTypeKey } from "@/components/ai-style/ai-style-shared";

const FACE_PROFILE_KEY_PREFIX = "mysaloon.ai.faceProfile";
const FACE_HISTORY_KEY_PREFIX = "mysaloon.ai.faceHistory";
const LEGACY_FACE_PROFILE_KEY = "mysaloon.ai.faceProfile";
const LEGACY_FACE_HISTORY_KEY = "mysaloon.ai.faceHistory";
const FACE_HISTORY_MAX = 6;
const LEGACY_FACE_MIGRATED_FLAG = "mysaloon.ai.legacyMigrated";
export const FACE_HISTORY_UPDATED_EVENT = "mysaloon:face-history-updated";

const USER_KEY = "mysaloon.auth.user";

export type SavedFaceProfile = {
  faceShapeKey: FaceShapeKey;
  hairTypeKey?: HairTypeKey;
  ratios: {
    widthToHeight: number;
    jawToForehead: number;
  };
  scannedAt: string;
  source: "camera_scan" | "ai_analysis";
};

export type FaceProfileHistoryEntry = {
  id: string;
  photoDataUrl: string;
  faceShapeKey?: FaceShapeKey;
  hairTypeKey?: HairTypeKey;
  scannedAt: string;
  source: "camera_scan" | "ai_analysis" | "gallery";
};

function profileKey(userId: number) {
  return `${FACE_PROFILE_KEY_PREFIX}:${userId}`;
}

function historyKey(userId: number) {
  return `${FACE_HISTORY_KEY_PREFIX}:${userId}`;
}

export function getActiveUserId(): number | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: number };
    return typeof parsed.id === "number" ? parsed.id : null;
  } catch {
    return null;
  }
}

function migrateLegacyStorage(userId: number) {
  try {
    if (localStorage.getItem(LEGACY_FACE_MIGRATED_FLAG)) return;

    const scopedHistory = historyKey(userId);
    if (!localStorage.getItem(scopedHistory)) {
      const legacyHistory = localStorage.getItem(LEGACY_FACE_HISTORY_KEY);
      if (legacyHistory) localStorage.setItem(scopedHistory, legacyHistory);
    }
    const scopedProfile = profileKey(userId);
    if (!localStorage.getItem(scopedProfile)) {
      const legacyProfile = localStorage.getItem(LEGACY_FACE_PROFILE_KEY);
      if (legacyProfile) localStorage.setItem(scopedProfile, legacyProfile);
    }
    localStorage.removeItem(LEGACY_FACE_HISTORY_KEY);
    localStorage.removeItem(LEGACY_FACE_PROFILE_KEY);
    localStorage.setItem(LEGACY_FACE_MIGRATED_FLAG, "1");
  } catch {
    /* noop */
  }
}

export function prepareFaceProfileStorageForUser(userId: number) {
  migrateLegacyStorage(userId);
}

export function saveFaceProfile(profile: SavedFaceProfile, userId?: number) {
  const uid = userId ?? getActiveUserId();
  if (!uid) return;
  try {
    localStorage.setItem(profileKey(uid), JSON.stringify(profile));
  } catch {
    /* noop */
  }
}

export function loadFaceProfile(userId?: number): SavedFaceProfile | null {
  const uid = userId ?? getActiveUserId();
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(profileKey(uid));
    if (!raw) return null;
    return JSON.parse(raw) as SavedFaceProfile;
  } catch {
    return null;
  }
}

export function loadFaceProfileHistory(userId?: number): FaceProfileHistoryEntry[] {
  const uid = userId ?? getActiveUserId();
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(historyKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FaceProfileHistoryEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, FACE_HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

function persistFaceProfileHistory(userId: number, entries: FaceProfileHistoryEntry[]) {
  localStorage.setItem(historyKey(userId), JSON.stringify(entries.slice(0, FACE_HISTORY_MAX)));
  window.dispatchEvent(new Event(FACE_HISTORY_UPDATED_EVENT));
}

export function syncFaceProfileHistoryCache(
  userId: number,
  entries: FaceProfileHistoryEntry[],
) {
  try {
    persistFaceProfileHistory(userId, entries.slice(0, FACE_HISTORY_MAX));
  } catch {
    /* noop */
  }
}

export function appendFaceProfileHistory(
  entry: Omit<FaceProfileHistoryEntry, "id">,
  userId?: number,
) {
  const uid = userId ?? getActiveUserId();
  if (!uid) return;
  try {
    const next: FaceProfileHistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };
    persistFaceProfileHistory(uid, [next, ...loadFaceProfileHistory(uid)]);
  } catch {
    /* noop */
  }
}

export function enrichLatestFaceProfileHistory(
  photoDataUrl: string,
  patch: Partial<Pick<FaceProfileHistoryEntry, "faceShapeKey" | "hairTypeKey" | "source" | "scannedAt">>,
  userId?: number,
) {
  const uid = userId ?? getActiveUserId();
  if (!uid) return;
  try {
    const list = loadFaceProfileHistory(uid);
    if (!list.length || list[0].photoDataUrl !== photoDataUrl) return;
    list[0] = { ...list[0], ...patch };
    persistFaceProfileHistory(uid, list);
  } catch {
    /* noop */
  }
}

export function clearFaceProfileForUser(userId: number) {
  try {
    localStorage.removeItem(profileKey(userId));
    localStorage.removeItem(historyKey(userId));
    window.dispatchEvent(new Event(FACE_HISTORY_UPDATED_EVENT));
  } catch {
    /* noop */
  }
}

export function clearFaceProfile() {
  const uid = getActiveUserId();
  if (uid) clearFaceProfileForUser(uid);
}
