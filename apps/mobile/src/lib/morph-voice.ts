import { Platform } from "react-native";

export const MORPH_VOICE_CATALOG = [
  {
    id: "charon" as const,
    gender: "male" as const,
    nameKey: "chat.settings.voiceCharon",
    hintKey: "chat.settings.voiceCharonHint",
  },
  {
    id: "orus" as const,
    gender: "male" as const,
    nameKey: "chat.settings.voiceOrus",
    hintKey: "chat.settings.voiceOrusHint",
  },
  {
    id: "kore" as const,
    gender: "female" as const,
    nameKey: "chat.settings.voiceKore",
    hintKey: "chat.settings.voiceKoreHint",
  },
  {
    id: "aoede" as const,
    gender: "female" as const,
    nameKey: "chat.settings.voiceAoede",
    hintKey: "chat.settings.voiceAoedeHint",
  },
];

const MD_FENCE = /```[\s\S]*?```/g;
const MD_LINK = /\[([^\]]+)\]\([^)]+\)/g;
const MD_INLINE = /`([^`]+)`/g;
const MD_HEADING = /^\s{0,3}#{1,6}\s+/gm;
const MD_BOLD = /\*\*([^*]+)\*\*/g;
const MD_BOLD2 = /__([^_]+)__/g;
const MD_ITALIC = /\*([^*]+)\*/g;
const MD_LIST = /^\s*[-*+]\s+/gm;
const MD_NUM = /^\s*\d+\.\s+/gm;

/** Backend `sanitize_for_speech` bilan bir xil — qurilma TTS fallback uchun. */
export function sanitizeSpeechText(text: string, maxChars = 2500): string {
  let raw = (text || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return "";
  raw = raw.replace(MD_FENCE, " ");
  raw = raw.replace(MD_LINK, "$1");
  raw = raw.replace(MD_INLINE, "$1");
  raw = raw.replace(MD_HEADING, "");
  raw = raw.replace(MD_BOLD, "$1");
  raw = raw.replace(MD_BOLD2, "$1");
  raw = raw.replace(MD_ITALIC, "$1");
  raw = raw.replace(MD_LIST, "");
  raw = raw.replace(MD_NUM, "");
  raw = raw.replace(/\*\*|__/g, "");
  raw = raw.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ");
  const cleaned = raw.trim();
  if (cleaned.length <= maxChars) return cleaned;
  const cut = cleaned.slice(0, maxChars);
  const end = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"), cut.lastIndexOf("\n"));
  if (end >= maxChars / 2) return cut.slice(0, end + 1).trim();
  return cut.replace(/\s+\S*$/, "").trim();
}

export function recordingMime(): { extension: string; mime: string } {
  if (Platform.OS === "web") return { extension: "webm", mime: "audio/webm" };
  return { extension: "m4a", mime: "audio/mp4" };
}

/** Metering: nutq boshlanganidan keyin sukunat — avtomatik to'xtatish. */
export function shouldAutoStopListening(opts: {
  metering: number | undefined;
  elapsedMs: number;
  heardSpeech: boolean;
  silentMs: number;
}): { heardSpeech: boolean; silentMs: number; stop: boolean } {
  const level = typeof opts.metering === "number" ? opts.metering : -160;
  const speaking = level > -34;
  const heardSpeech = opts.heardSpeech || (speaking && opts.elapsedMs > 480);
  const silentMs = speaking ? 0 : heardSpeech ? opts.silentMs + 120 : opts.silentMs;
  const stop =
    heardSpeech && silentMs >= 1400 && opts.elapsedMs >= 1100 && opts.elapsedMs < 45_000;
  return { heardSpeech, silentMs, stop };
}

export function speechLangTag(lang: "uz" | "ru" | "auto" | string): string {
  if (lang === "ru") return "ru-RU";
  return "uz-UZ";
}
