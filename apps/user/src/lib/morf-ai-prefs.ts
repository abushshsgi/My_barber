const KEY = "mysaloon.morphAi.prefs.v1";

export type MorphAiClientPrefs = {
  privacyLocalOnly: boolean;
  saveHistory: boolean;
  persistLooks: boolean;
  limitNotify: boolean;
  useTryOnContext: boolean;
  streaming: boolean;
};

export const DEFAULT_MORPH_AI_PREFS: MorphAiClientPrefs = {
  privacyLocalOnly: false,
  saveHistory: true,
  persistLooks: true,
  limitNotify: true,
  useTryOnContext: true,
  streaming: true,
};

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

export function readMorphAiPrefs(): MorphAiClientPrefs {
  try {
    if (typeof window === "undefined") return { ...DEFAULT_MORPH_AI_PREFS };
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_MORPH_AI_PREFS };
    const parsed = JSON.parse(raw) as Partial<MorphAiClientPrefs>;
    return {
      privacyLocalOnly: asBool(parsed.privacyLocalOnly, DEFAULT_MORPH_AI_PREFS.privacyLocalOnly),
      saveHistory: asBool(parsed.saveHistory, DEFAULT_MORPH_AI_PREFS.saveHistory),
      persistLooks: asBool(parsed.persistLooks, DEFAULT_MORPH_AI_PREFS.persistLooks),
      limitNotify: asBool(parsed.limitNotify, DEFAULT_MORPH_AI_PREFS.limitNotify),
      useTryOnContext: asBool(parsed.useTryOnContext, DEFAULT_MORPH_AI_PREFS.useTryOnContext),
      streaming: asBool(parsed.streaming, DEFAULT_MORPH_AI_PREFS.streaming),
    };
  } catch {
    return { ...DEFAULT_MORPH_AI_PREFS };
  }
}

export function writeMorphAiPrefs(next: MorphAiClientPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function patchMorphAiPrefs(patch: Partial<MorphAiClientPrefs>): MorphAiClientPrefs {
  const next = { ...readMorphAiPrefs(), ...patch };
  writeMorphAiPrefs(next);
  return next;
}

export function shouldPersistChatToServer(prefs = readMorphAiPrefs()): boolean {
  return Boolean(prefs.saveHistory) && !prefs.privacyLocalOnly;
}

export function shouldPersistLooksToServer(prefs = readMorphAiPrefs()): boolean {
  return Boolean(prefs.persistLooks);
}
