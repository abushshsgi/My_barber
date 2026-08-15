import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFS_KEY = "morph_chat_prefs_v2";
const LIMITS_KEY = "morph_chat_limits_v1";

export type MorphChatReplyLang = "app" | "uz" | "ru";
export type MorphChatReplyStyle = "short" | "detailed" | "barber";
export type MorphChatAdviceGender = "auto" | "male" | "female";

export type MorphChatPrefs = {
  /** Try-on / yuz tahlili kontekstini chatga ulash. */
  useTryOnContext: boolean;
  /** Lokal chat tarixini saqlash. */
  saveHistory: boolean;
  /** Javob tili. */
  replyLang: MorphChatReplyLang;
  /** Javob uslubi. */
  replyStyle: MorphChatReplyStyle;
  /** Token-by-token yozish. */
  streaming: boolean;
  /** Mikrofon tugmasi. */
  voiceInput: boolean;
  /** Limit tugaganda/ogohlantirish. */
  limitNotify: boolean;
  /** Maslahat uchun jins preferensiyasi. */
  adviceGender: MorphChatAdviceGender;
  /** Tarixni serverga yubormaslik (faqat joriy xabar). */
  privacyLocalOnly: boolean;
};

export type MorphChatLimitsSnapshot = {
  daily_limit: number;
  daily_used: number | null;
  daily_remaining: number | null;
  updatedAt: string;
};

export const DEFAULT_MORPH_CHAT_PREFS: MorphChatPrefs = {
  useTryOnContext: true,
  saveHistory: true,
  replyLang: "app",
  replyStyle: "detailed",
  streaming: true,
  voiceInput: false,
  limitNotify: true,
  adviceGender: "auto",
  privacyLocalOnly: false,
};

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function asReplyLang(v: unknown): MorphChatReplyLang {
  return v === "uz" || v === "ru" || v === "app" ? v : "app";
}

function asReplyStyle(v: unknown): MorphChatReplyStyle {
  return v === "short" || v === "detailed" || v === "barber" ? v : "detailed";
}

function asAdviceGender(v: unknown): MorphChatAdviceGender {
  return v === "male" || v === "female" || v === "auto" ? v : "auto";
}

export async function readMorphChatPrefs(): Promise<MorphChatPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    // v1 migratsiya
    const legacy = !raw ? await AsyncStorage.getItem("morph_chat_prefs_v1") : null;
    const source = raw || legacy;
    if (!source) return { ...DEFAULT_MORPH_CHAT_PREFS };
    const parsed = JSON.parse(source) as Partial<MorphChatPrefs>;
    return {
      useTryOnContext: asBool(parsed.useTryOnContext, DEFAULT_MORPH_CHAT_PREFS.useTryOnContext),
      saveHistory: asBool(parsed.saveHistory, DEFAULT_MORPH_CHAT_PREFS.saveHistory),
      replyLang: asReplyLang(parsed.replyLang),
      replyStyle: asReplyStyle(parsed.replyStyle),
      streaming: asBool(parsed.streaming, DEFAULT_MORPH_CHAT_PREFS.streaming),
      voiceInput: asBool(parsed.voiceInput, DEFAULT_MORPH_CHAT_PREFS.voiceInput),
      limitNotify: asBool(parsed.limitNotify, DEFAULT_MORPH_CHAT_PREFS.limitNotify),
      adviceGender: asAdviceGender(parsed.adviceGender),
      privacyLocalOnly: asBool(
        parsed.privacyLocalOnly,
        DEFAULT_MORPH_CHAT_PREFS.privacyLocalOnly,
      ),
    };
  } catch {
    return { ...DEFAULT_MORPH_CHAT_PREFS };
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

/** Kunlik limitdan foiz (0–100). */
export function morphChatUsagePercent(limits: {
  daily_limit: number;
  daily_used: number | null;
} | null): number {
  if (!limits || !limits.daily_limit || limits.daily_used == null) return 0;
  const pct = Math.round((limits.daily_used / limits.daily_limit) * 100);
  return Math.max(0, Math.min(100, pct));
}
