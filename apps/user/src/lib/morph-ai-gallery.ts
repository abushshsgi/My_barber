import { getActiveUserId } from "@/lib/face-profile";

const KEY_PREFIX = "mysaloon.morphAi.generations";
const MAX_ENTRIES = 48;
export const MORPH_AI_GALLERY_UPDATED_EVENT = "mysaloon:morph-ai-gallery-updated";

export type MorphAiGeneration = {
  id: string;
  styleId: string;
  title: string;
  previewImage: string;
  createdAt: string;
  personaId?: string;
};

function storageKey() {
  const userId = getActiveUserId();
  return userId ? `${KEY_PREFIX}:${userId}` : `${KEY_PREFIX}:guest`;
}

function readAll(): MorphAiGeneration[] {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MorphAiGeneration[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: MorphAiGeneration[]) {
  localStorage.setItem(storageKey(), JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  window.dispatchEvent(new Event(MORPH_AI_GALLERY_UPDATED_EVENT));
}

export function loadMorphAiGenerations(): MorphAiGeneration[] {
  return readAll();
}

export function saveMorphAiGeneration(entry: Omit<MorphAiGeneration, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
}) {
  const next: MorphAiGeneration = {
    id: entry.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    styleId: entry.styleId,
    title: entry.title,
    previewImage: entry.previewImage,
    createdAt: entry.createdAt ?? new Date().toISOString(),
    personaId: entry.personaId,
  };
  const rest = readAll().filter(
    (item) => !(item.styleId === next.styleId && item.previewImage === next.previewImage),
  );
  writeAll([next, ...rest]);
  return next;
}

export function removeMorphAiGeneration(id: string) {
  writeAll(readAll().filter((item) => item.id !== id));
}
