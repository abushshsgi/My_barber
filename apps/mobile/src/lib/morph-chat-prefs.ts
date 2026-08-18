import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFS_KEY = "morph_chat_prefs_v2";
const LIMITS_KEY = "morph_chat_limits_v1";

export type MorphChatReplyLang = "app" | "uz" | "ru";
export type MorphChatReplyStyle = "short" | "detailed" | "barber";
export type MorphChatAdviceGender = "auto" | "male" | "female";
export type MorphVoiceGenderPref = "male" | "female";
export type MorphVoiceLangPref = "auto" | "uz" | "ru";

export const MORPH_VOICE_IDS = ["puck", "orus", "kore", "aoede"] as const;
export type MorphVoiceId = (typeof MORPH_VOICE_IDS)[number];

export const DEFAULT_MALE_VOICE: MorphVoiceId = "puck";
export const DEFAULT_FEMALE_VOICE: MorphVoiceId = "aoede";

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
  /** Mikrofon tugmasi va ovozli suhbat. */
  voiceInput: boolean;
  /** AI javobini ovozda o'qish. */
  autoSpeak: boolean;
  /** Gemini Live uslubidagi ketma-ket suhbat. */
  conversationMode: boolean;
  /** TTS ovoz jinsi. */
  voiceGender: MorphVoiceGenderPref;
  /** Tanlangan Gemini TTS ovozi. */
  voiceId: MorphVoiceId;
  /** STT tili. */
  voiceLang: MorphVoiceLangPref;
  /** Limit tugaganda/ogohlantirish. */
  limitNotify: boolean;
  /** Maslahat uchun jins preferensiyasi. */
  adviceGender: MorphChatAdviceGender;
  /** Tarixni serverga yubormaslik (faqat joriy xabar). */
  privacyLocalOnly: boolean;
  /** Try-on / studio / selfie tarixini serverga yozish. */
  persistLooks: boolean;
};

export type MorphChatLimitsSnapshot = {
  daily_limit: number;
  daily_used: number | null;
  daily_remaining: number | null;
  token_limit?: number;
  token_used?: number | null;
  token_remaining?: number | null;
  updatedAt: string;
};

export const DEFAULT_MORPH_CHAT_PREFS: MorphChatPrefs = {
  useTryOnContext: true,
  saveHistory: true,
  replyLang: "app",
  replyStyle: "detailed",
  streaming: true,
  voiceInput: true,
  autoSpeak: true,
  conversationMode: true,
  voiceGender: "male",
  voiceId: DEFAULT_MALE_VOICE,
  voiceLang: "auto",
  limitNotify: true,
  adviceGender: "auto",
  privacyLocalOnly: false,
  persistLooks: true,
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

function asVoiceGender(v: unknown): MorphVoiceGenderPref {
  return v === "female" ? "female" : "male";
}

function asVoiceLang(v: unknown): MorphVoiceLangPref {
  return v === "uz" || v === "ru" || v === "auto" ? v : "auto";
}

function asVoiceId(v: unknown, gender: MorphVoiceGenderPref): MorphVoiceId {
  if (v === "charon") return "puck";
  if (v === "puck" || v === "orus" || v === "kore" || v === "aoede") return v;
  return gender === "female" ? DEFAULT_FEMALE_VOICE : DEFAULT_MALE_VOICE;
}

export function defaultVoiceForGender(gender: MorphVoiceGenderPref): MorphVoiceId {
  return gender === "female" ? DEFAULT_FEMALE_VOICE : DEFAULT_MALE_VOICE;
}

export async function readMorphChatPrefs(): Promise<MorphChatPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    // v1 migratsiya
    const legacy = !raw ? await AsyncStorage.getItem("morph_chat_prefs_v1") : null;
    const source = raw || legacy;
    if (!source) return { ...DEFAULT_MORPH_CHAT_PREFS };
    const parsed = JSON.parse(source) as Partial<MorphChatPrefs>;
    const voiceGender = asVoiceGender(parsed.voiceGender);
    return {
      useTryOnContext: asBool(parsed.useTryOnContext, DEFAULT_MORPH_CHAT_PREFS.useTryOnContext),
      saveHistory: asBool(parsed.saveHistory, DEFAULT_MORPH_CHAT_PREFS.saveHistory),
      replyLang: asReplyLang(parsed.replyLang),
      replyStyle: asReplyStyle(parsed.replyStyle),
      streaming: asBool(parsed.streaming, DEFAULT_MORPH_CHAT_PREFS.streaming),
      voiceInput: asBool(parsed.voiceInput, DEFAULT_MORPH_CHAT_PREFS.voiceInput),
      autoSpeak: asBool(parsed.autoSpeak, DEFAULT_MORPH_CHAT_PREFS.autoSpeak),
      conversationMode: asBool(
        parsed.conversationMode,
        DEFAULT_MORPH_CHAT_PREFS.conversationMode,
      ),
      voiceGender,
      voiceId: asVoiceId(parsed.voiceId, voiceGender),
      voiceLang: asVoiceLang(parsed.voiceLang),
      limitNotify: asBool(parsed.limitNotify, DEFAULT_MORPH_CHAT_PREFS.limitNotify),
      adviceGender: asAdviceGender(parsed.adviceGender),
      privacyLocalOnly: asBool(
        parsed.privacyLocalOnly,
        DEFAULT_MORPH_CHAT_PREFS.privacyLocalOnly,
      ),
      persistLooks: asBool(parsed.persistLooks, DEFAULT_MORPH_CHAT_PREFS.persistLooks),
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

export function shouldPersistChatToServer(prefs: MorphChatPrefs): boolean {
  return Boolean(prefs.saveHistory) && !prefs.privacyLocalOnly;
}

export async function shouldPersistLooksToServer(): Promise<boolean> {
  const prefs = await readMorphChatPrefs();
  return Boolean(prefs.persistLooks);
}
