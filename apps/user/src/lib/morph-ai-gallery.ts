import { getActiveUserId } from "@/lib/face-profile";
import {
  fetchMorphAiGenerations,
  saveMorphAiGenerationRemote,
  type MorphAiGenerationApi,
} from "@/lib/api/ai";
import { resolveMediaUrl } from "@/lib/media-url";

const KEY_PREFIX = "mysaloon.morphAi.generations";
const MAX_ENTRIES = 60;
export const MORPH_AI_GALLERY_UPDATED_EVENT = "mysaloon:morph-ai-gallery-updated";

export type MorphAiGeneration = {
  id: string;
  styleId: string;
  title: string;
  /** Generated try-on (after). */
  previewImage: string;
  /** Original selfie (before), when available. */
  beforeImage?: string;
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

function mapApiGeneration(entry: MorphAiGenerationApi): MorphAiGeneration | null {
  if (!entry.after_url) return null;
  const after = resolveMediaUrl(entry.after_url) ?? entry.after_url;
  const before = entry.before_url
    ? (resolveMediaUrl(entry.before_url) ?? entry.before_url)
    : undefined;
  return {
    id: String(entry.id),
    styleId: entry.style_id || "",
    title: entry.title || entry.style_id || "Try-on",
    previewImage: after,
    beforeImage: before,
    createdAt: entry.created_at,
    personaId: entry.persona_id || undefined,
  };
}

export function loadMorphAiGenerations(): MorphAiGeneration[] {
  return readAll();
}

/** Guest try-ons → logged-in user key after auth. */
export function migrateGuestMorphAiGenerations(userId: number) {
  try {
    const guestKey = `${KEY_PREFIX}:guest`;
    const userKey = `${KEY_PREFIX}:${userId}`;
    const guestRaw = localStorage.getItem(guestKey);
    if (!guestRaw) return;
    const guest = JSON.parse(guestRaw) as MorphAiGeneration[];
    if (!Array.isArray(guest) || guest.length === 0) return;
    const existingRaw = localStorage.getItem(userKey);
    const existing = existingRaw
      ? (JSON.parse(existingRaw) as MorphAiGeneration[])
      : [];
    const existingIds = new Set(
      (Array.isArray(existing) ? existing : []).map((item) => item.id),
    );
    const merged = [
      ...guest.filter((item) => item?.id && !existingIds.has(item.id)),
      ...(Array.isArray(existing) ? existing : []),
    ].slice(0, MAX_ENTRIES);
    localStorage.setItem(userKey, JSON.stringify(merged));
    localStorage.removeItem(guestKey);
    window.dispatchEvent(new Event(MORPH_AI_GALLERY_UPDATED_EVENT));
  } catch {
    /* noop */
  }
}

export function syncMorphAiGenerationsCache(entries: MorphAiGeneration[]) {
  writeAll(entries.slice(0, MAX_ENTRIES));
}

/** Pull DB-backed generation history into local cache. */
export async function refreshMorphAiGenerationsCache(): Promise<MorphAiGeneration[]> {
  const userId = getActiveUserId();
  if (!userId) return readAll();
  try {
    const remote = await fetchMorphAiGenerations();
    const mapped = remote
      .map(mapApiGeneration)
      .filter((item): item is MorphAiGeneration => Boolean(item));
    // Keep very recent optimistic local rows until server ack.
    const local = readAll();
    const remoteIds = new Set(mapped.map((item) => item.id));
    const now = Date.now();
    const pending = local.filter((item) => {
      if (remoteIds.has(item.id)) return false;
      if (/^\d+$/.test(item.id)) return false;
      const at = Date.parse(item.createdAt);
      return Number.isFinite(at) && now - at < 90_000;
    });
    const merged = [...pending, ...mapped].slice(0, MAX_ENTRIES);
    writeAll(merged);
    return merged;
  } catch {
    return readAll();
  }
}

/**
 * Optimistic local save + optional async DB persist.
 * Try-on: server allaqachon `persist_tryon_generation` yozadi — `syncRemote: false` qiling,
 * aks holda historyda bir generatsiya ikki marta chiqadi.
 * Studio: backend history yozmaydi — `syncRemote` default `true` qoladi.
 */
export function saveMorphAiGeneration(
  entry: Omit<MorphAiGeneration, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
    /** false = faqat local cache (try-on). Default true = POST /ai/generations/ */
    syncRemote?: boolean;
  },
) {
  const syncRemote = entry.syncRemote !== false;
  const next: MorphAiGeneration = {
    id: entry.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    styleId: entry.styleId,
    title: entry.title,
    previewImage: entry.previewImage,
    beforeImage: entry.beforeImage,
    createdAt: entry.createdAt ?? new Date().toISOString(),
    personaId: entry.personaId,
  };
  const rest = readAll().filter(
    (item) => !(item.styleId === next.styleId && item.previewImage === next.previewImage),
  );
  writeAll([next, ...rest]);

  if (syncRemote && getActiveUserId() && next.previewImage) {
    void saveMorphAiGenerationRemote({
      style_id: next.styleId,
      title: next.title,
      persona_id: next.personaId,
      before_image: next.beforeImage,
      after_image: next.previewImage,
    })
      .then((saved) => {
        const mapped = mapApiGeneration(saved);
        if (!mapped) return;
        const list = readAll().filter(
          (item) =>
            item.id !== next.id &&
            !(item.styleId === mapped.styleId && item.previewImage === mapped.previewImage),
        );
        writeAll([mapped, ...list]);
      })
      .catch(() => {
        /* keep optimistic local row */
      });
  }

  return next;
}

export function removeMorphAiGeneration(id: string) {
  writeAll(readAll().filter((item) => item.id !== id));
}
