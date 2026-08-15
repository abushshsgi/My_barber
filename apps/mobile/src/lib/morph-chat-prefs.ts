import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFS_KEY = "morph_chat_prefs_v1";
const LIMITS_KEY = "morph_chat_limits_v1";

export type MorphChatPrefs = {
  /** Try-on / yuz tahlili kontekstini chatga ulash. */
  useTryOnContext: boolean;
  /** Lokal chat tarixini saqlash. */
  saveHistory: boolean;
};

export type MorphChatLimitsSnapshot = {
  daily_limit: number;
  daily_used: number | null;
  daily_remaining: number | null;
  updatedAt: string;
};

const DEFAULT_PREFS: MorphChatPrefs = {
  useTryOnContext: true,
  saveHistory: true,
};

export async function readMorphChatPrefs(): Promise<MorphChatPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<MorphChatPrefs>;
    return {
      useTryOnContext:
        typeof parsed.useTryOnContext === "boolean"
          ? parsed.useTryOnContext
          : DEFAULT_PREFS.useTryOnContext,
      saveHistory:
        typeof parsed.saveHistory === "boolean"
          ? parsed.saveHistory
          : DEFAULT_PREFS.saveHistory,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function writeMorphChatPrefs(next: MorphChatPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
}

export async function readMorphChatLimitsSnapshot(): Promise<MorphChatLimitsSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(LIMITS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MorphChatLimitsSnapshot;
  } catch {
    return null;
  }
}

export async function writeMorphChatLimitsSnapshot(
  limits: Omit<MorphChatLimitsSnapshot, "updatedAt">,
): Promise<void> {
  const payload: MorphChatLimitsSnapshot = {
    ...limits,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(LIMITS_KEY, JSON.stringify(payload));
}
