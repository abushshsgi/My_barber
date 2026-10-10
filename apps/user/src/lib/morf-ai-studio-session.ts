const KEY = "mysaloon.morphAi.studioDraft";

export type MorphStudioDraft = {
  /** Hozirgi preview (tahrirlangan bo'lishi mumkin). */
  image: string;
  /**
   * Studio tahrirlari shu asosdan chiqadi — o'zgarmas manba.
   * Yo'q bo'lsa `image` asos deb olinadi.
   */
  baseImage?: string;
  /** Original selfie for before/after (not the try-on output). */
  beforeImage?: string;
  styleId?: string;
  styleTitle?: string;
  source?: "tryon" | "history" | "gallery" | "camera" | "generation";
  stashedAt: string;
};

export function stashMorphStudioDraft(
  draft: Omit<MorphStudioDraft, "stashedAt"> & { stashedAt?: string },
) {
  const next: MorphStudioDraft = {
    image: draft.image,
    baseImage: draft.baseImage,
    beforeImage: draft.beforeImage,
    styleId: draft.styleId,
    styleTitle: draft.styleTitle,
    source: draft.source,
    stashedAt: draft.stashedAt ?? new Date().toISOString(),
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export function peekMorphStudioDraft(): MorphStudioDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MorphStudioDraft;
    if (!parsed?.image || typeof parsed.image !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearMorphStudioDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function takeMorphStudioDraft(): MorphStudioDraft | null {
  const draft = peekMorphStudioDraft();
  clearMorphStudioDraft();
  return draft;
}
