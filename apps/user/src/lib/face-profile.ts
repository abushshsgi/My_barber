import type { FaceShapeKey, HairTypeKey } from "@/components/ai-style/ai-style-shared";

const FACE_PROFILE_KEY = "mysaloon.ai.faceProfile";
const FACE_HISTORY_KEY = "mysaloon.ai.faceHistory";
const FACE_HISTORY_MAX = 6;
export const FACE_HISTORY_UPDATED_EVENT = "mysaloon:face-history-updated";

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

export function saveFaceProfile(profile: SavedFaceProfile) {
  try {
    localStorage.setItem(FACE_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* noop */
  }
}

export function loadFaceProfile(): SavedFaceProfile | null {
  try {
    const raw = localStorage.getItem(FACE_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedFaceProfile;
  } catch {
    return null;
  }
}

export function loadFaceProfileHistory(): FaceProfileHistoryEntry[] {
  try {
    const raw = localStorage.getItem(FACE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FaceProfileHistoryEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, FACE_HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

function persistFaceProfileHistory(entries: FaceProfileHistoryEntry[]) {
  localStorage.setItem(FACE_HISTORY_KEY, JSON.stringify(entries.slice(0, FACE_HISTORY_MAX)));
  window.dispatchEvent(new Event(FACE_HISTORY_UPDATED_EVENT));
}

export function appendFaceProfileHistory(entry: Omit<FaceProfileHistoryEntry, "id">) {
  try {
    const next: FaceProfileHistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };
    persistFaceProfileHistory([next, ...loadFaceProfileHistory()]);
  } catch {
    /* noop */
  }
}

export function enrichLatestFaceProfileHistory(
  photoDataUrl: string,
  patch: Partial<Pick<FaceProfileHistoryEntry, "faceShapeKey" | "hairTypeKey" | "source" | "scannedAt">>,
) {
  try {
    const list = loadFaceProfileHistory();
    if (!list.length || list[0].photoDataUrl !== photoDataUrl) return;
    list[0] = { ...list[0], ...patch };
    persistFaceProfileHistory(list);
  } catch {
    /* noop */
  }
}

export function clearFaceProfile() {
  try {
    localStorage.removeItem(FACE_PROFILE_KEY);
    localStorage.removeItem(FACE_HISTORY_KEY);
    window.dispatchEvent(new Event(FACE_HISTORY_UPDATED_EVENT));
  } catch {
    /* noop */
  }
}
