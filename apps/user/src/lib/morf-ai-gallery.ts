import { getActiveUserId } from "@/lib/face-profile";
import {
  fetchMorphAiGenerations,
  saveMorphAiGenerationRemote,
  type MorphAiGenerationApi,
} from "@/lib/api/ai";
import { resolveMediaUrl } from "@/lib/media-url";
import { shouldPersistLooksToServer } from "@/lib/morf-ai-prefs";
import { safeLocalStorageSet, stripDataUrlForStorage } from "@/lib/storage-quota";

const KEY_PREFIX = "mysaloon.morphAi.generations";
const GUEST_KEY = `${KEY_PREFIX}:guest`;
/** Server bilan bir xil (backend GENERATION_HISTORY_MAX_PER_USER). */
export const MAX_ENTRIES = 60;
export const MORPH_AI_GALLERY_UPDATED_EVENT = "mysaloon:morf-ai-gallery-updated";

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

/** Kirgan foydalanuvchi — tarix API dan; telefonga rasm yozilmaydi. */
let generationsMemory: MorphAiGeneration[] = [];

function isLoggedInGallery(): boolean {
  return Boolean(getActiveUserId());
}

function readGuestLocal(): MorphAiGeneration[] {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MorphAiGeneration[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function compactForLocalStorage(entries: MorphAiGeneration[]): MorphAiGeneration[] {
  return entries
    .map((entry) => ({
      ...entry,
      previewImage: stripDataUrlForStorage(entry.previewImage) ?? "",
      beforeImage: stripDataUrlForStorage(entry.beforeImage),
    }))
    .filter((entry) => Boolean(entry.previewImage));
}

function writeGuestLocal(entries: MorphAiGeneration[]) {
  const payload = compactForLocalStorage(entries.slice(0, MAX_ENTRIES));
  if (safeLocalStorageSet(GUEST_KEY, JSON.stringify(payload))) {
    window.dispatchEvent(new Event(MORPH_AI_GALLERY_UPDATED_EVENT));
  }
}

function writeAll(entries: MorphAiGeneration[]) {
  const slice = entries.slice(0, MAX_ENTRIES);
  if (isLoggedInGallery()) {
    generationsMemory = slice;
    window.dispatchEvent(new Event(MORPH_AI_GALLERY_UPDATED_EVENT));
    return;
  }
  writeGuestLocal(slice);
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
  if (isLoggedInGallery()) return generationsMemory;
  return readGuestLocal();
}

/** Eski duplicate localStorage (kirgan user) ni tozalash. */
export function pruneHeavyMorphLocalCaches() {
  if (typeof localStorage === "undefined") return;
  const userId = getActiveUserId();
  if (userId) {
    try {
      localStorage.removeItem(`${KEY_PREFIX}:${userId}`);
    } catch {
      /* noop */
    }
  }
  try {
    localStorage.removeItem("mysaloon.morphAi.chat.threads.v1");
  } catch {
    /* noop */
  }
  if (!isLoggedInGallery()) {
    writeAll(readGuestLocal());
  }
}

/** Guest try-ons → login; server keyingi refresh da to‘ldiradi. */
export function migrateGuestMorphAiGenerations(userId: number) {
  try {
    const guest = readGuestLocal();
    if (!guest.length) return;
    const existing = generationsMemory;
    const existingIds = new Set(existing.map((item) => item.id));
    generationsMemory = [
      ...guest.filter((item) => item?.id && !existingIds.has(item.id)),
      ...existing,
    ].slice(0, MAX_ENTRIES);
    localStorage.removeItem(GUEST_KEY);
    window.dispatchEvent(new Event(MORPH_AI_GALLERY_UPDATED_EVENT));
    void userId;
  } catch {
    /* noop */
  }
}

export function syncMorphAiGenerationsCache(entries: MorphAiGeneration[]) {
  writeAll(entries.slice(0, MAX_ENTRIES));
}

/** DB generation history — asosiy manba. */
export async function refreshMorphAiGenerationsCache(): Promise<MorphAiGeneration[]> {
  const userId = getActiveUserId();
  if (!userId) return readGuestLocal();
  try {
    const remote = await fetchMorphAiGenerations();
    const mapped = remote
      .map(mapApiGeneration)
      .filter((item): item is MorphAiGeneration => Boolean(item));
    const local = isLoggedInGallery() ? generationsMemory : readGuestLocal();
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
    return loadMorphAiGenerations();
  }
}

/**
 * Try-on: server `persist_tryon_generation` yozadi — faqat xotira yangilanadi.
 * Studio: kerak bo‘lsa POST /ai/generations/.
 */
export function saveMorphAiGeneration(
  entry: Omit<MorphAiGeneration, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
    syncRemote?: boolean;
  },
) {
  const syncRemote = entry.syncRemote !== false;
  const next: MorphAiGeneration = {
    id: entry.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    styleId: entry.styleId,
    title: entry.title,
    previewImage: entry.previewImage,
    beforeImage: stripDataUrlForStorage(entry.beforeImage),
    createdAt: entry.createdAt ?? new Date().toISOString(),
    personaId: entry.personaId,
  };

  if (isLoggedInGallery()) {
    const rest = generationsMemory.filter(
      (item) => !(item.styleId === next.styleId && item.previewImage === next.previewImage),
    );
    writeAll([next, ...rest]);
  } else {
    const rest = readGuestLocal().filter(
      (item) => !(item.styleId === next.styleId && item.previewImage === next.previewImage),
    );
    writeAll([next, ...rest]);
  }

  if (syncRemote && getActiveUserId() && next.previewImage && shouldPersistLooksToServer()) {
    void saveMorphAiGenerationRemote({
      style_id: next.styleId,
      title: next.title,
      persona_id: next.personaId,
      before_image: entry.beforeImage,
      after_image: next.previewImage,
    })
      .then((saved) => {
        const mapped = mapApiGeneration(saved);
        if (!mapped) return;
        const list = loadMorphAiGenerations().filter(
          (item) =>
            item.id !== next.id &&
            !(item.styleId === mapped.styleId && item.previewImage === mapped.previewImage),
        );
        writeAll([mapped, ...list]);
      })
      .catch(() => {
        /* server navbatda */
      });
  }

  return next;
}

export function removeMorphAiGeneration(id: string) {
  writeAll(loadMorphAiGenerations().filter((item) => item.id !== id));
}
