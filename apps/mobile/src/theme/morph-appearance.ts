import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "morph_appearance_v3_dark";

export type MorphThemeName = "dark" | "light";
export type MorphFontSize = "s" | "m" | "l";
export type MorphChatFontSize = "xs" | "s" | "m" | "l" | "xl";

export const MORPH_FONT_SCALE: Record<MorphFontSize, number> = {
  s: 0.9,
  m: 1,
  l: 1.16,
};

export const MORPH_CHAT_FONT_STEPS: MorphChatFontSize[] = ["xs", "s", "m", "l", "xl"];

/** Soft Paper (#2) — oq/qora kombinatsiya, barcha Morf AI sahifalari. */
export const SOFT_PAPER = {
  bg: "#FAFAFA",
  card: "#FFFFFF",
  cardStrong: "#F0F0F0",
  line: "rgba(17, 17, 17, 0.12)",
  fg: "#111111",
  muted: "#737373",
  accent: "#111111",
  soft: "#F0F0F0",
  track: "#E5E5E5",
  destructive: "#FF3B30",
  warn: "#FF9F0A",
} as const;

export type MorphPalette = {
  theme: MorphThemeName;
  bg: string;
  card: string;
  cardStrong: string;
  line: string;
  fg: string;
  muted: string;
  accent: string;
  iconTile: string;
  track: string;
  destructive: string;
  warn: string;
  status: "light" | "dark";
};

export const MORPH_CHAT_FONT_SCALE: Record<MorphChatFontSize, number> = {
  xs: 0.82,
  s: 0.92,
  m: 1,
  l: 1.18,
  xl: 1.38,
};

export type MorphAppearance = {
  theme: MorphThemeName;
  fontSize: MorphFontSize;
  chatFontSize: MorphChatFontSize;
};

export const DEFAULT_MORPH_APPEARANCE: MorphAppearance = {
  theme: "light",
  fontSize: "m",
  chatFontSize: "m",
};

export const MORPH_PALETTES: Record<MorphThemeName, MorphPalette> = {
  light: {
    theme: "light",
    bg: SOFT_PAPER.bg,
    card: SOFT_PAPER.card,
    cardStrong: SOFT_PAPER.cardStrong,
    line: SOFT_PAPER.line,
    fg: SOFT_PAPER.fg,
    muted: SOFT_PAPER.muted,
    accent: SOFT_PAPER.accent,
    iconTile: SOFT_PAPER.soft,
    track: SOFT_PAPER.track,
    destructive: SOFT_PAPER.destructive,
    warn: SOFT_PAPER.warn,
    status: "dark",
  },
  dark: {
    theme: "dark",
    bg: "#0A0A0A",
    card: "#141414",
    cardStrong: "#1C1C1C",
    line: "rgba(255,255,255,0.14)",
    fg: "#FFFFFF",
    muted: "#A3A3A3",
    accent: "#FFFFFF",
    iconTile: "#222222",
    track: "#2A2A2A",
    destructive: "#FF453A",
    warn: "#FF9F0A",
    status: "light",
  },
};

export function paletteFor(theme: MorphThemeName): MorphPalette {
  return MORPH_PALETTES[theme];
}

export async function readMorphAppearance(): Promise<MorphAppearance> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_MORPH_APPEARANCE };
    const parsed = JSON.parse(raw) as Partial<MorphAppearance>;
    return {
      theme: parsed.theme === "dark" ? "dark" : "light",
      fontSize: parsed.fontSize === "s" || parsed.fontSize === "l" ? parsed.fontSize : "m",
      chatFontSize: MORPH_CHAT_FONT_STEPS.includes(parsed.chatFontSize as MorphChatFontSize)
        ? (parsed.chatFontSize as MorphChatFontSize)
        : "m",
    };
  } catch {
    return { ...DEFAULT_MORPH_APPEARANCE };
  }
}

export async function writeMorphAppearance(next: MorphAppearance): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}
