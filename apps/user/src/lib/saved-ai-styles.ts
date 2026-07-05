import { getActiveUserId } from "@/lib/face-profile";

const KEY_PREFIX = "mysaloon.ai.savedStyles";

export type SavedAiStyle = {
  styleId: string;
  title: string;
  previewImage: string;
  savedAt: string;
};

function storageKey() {
  const userId = getActiveUserId();
  return userId ? `${KEY_PREFIX}:${userId}` : `${KEY_PREFIX}:guest`;
}

function readAll(): SavedAiStyle[] {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedAiStyle[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: SavedAiStyle[]) {
  localStorage.setItem(storageKey(), JSON.stringify(entries));
}

export function loadSavedAiStyleIds(): string[] {
  return readAll().map((entry) => entry.styleId);
}

export function isAiStyleSaved(styleId: string): boolean {
  return readAll().some((entry) => entry.styleId === styleId);
}

export function saveAiStyle(entry: SavedAiStyle) {
  const rest = readAll().filter((item) => item.styleId !== entry.styleId);
  writeAll([entry, ...rest].slice(0, 24));
}

export function removeSavedAiStyle(styleId: string) {
  writeAll(readAll().filter((entry) => entry.styleId !== styleId));
}
