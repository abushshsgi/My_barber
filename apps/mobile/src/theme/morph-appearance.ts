import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "morph_appearance_v1";

export type MorphThemeName = "dark" | "light";
export type MorphFontSize = "s" | "m" | "l";

export const MORPH_FONT_SCALE: Record<MorphFontSize, number> = {
  s: 0.9,
  m: 1,
  l: 1.16,
};

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

export const MORPH_CHAT_FONT_SCALE: Record<MorphFontSize, number> = {
  s: 0.86,
  m: 1,
  l: 1.28,
};

export type MorphAppearance = {
  theme: MorphThemeName;
  fontSize: MorphFontSize;
  chatFontSize: MorphFontSize;
};

export const DEFAULT_MORPH_APPEARANCE: MorphAppearance = {
  theme: "dark",
  fontSize: "m",
  chatFontSize: "m",
};

export const MORPH_PALETTES: Record<MorphThemeName, MorphPalette> = {
  dark: {
    theme: "dark",
    bg: "#0C0C0E",
    card: "#161618",
    cardStrong: "#222226",
    line: "rgba(255,255,255,0.08)",
    fg: "#F5F5F7",
    muted: "#8E8E93",
    accent: "#0A84FF",
    iconTile: "#222226",
    track: "#2A2A2E",
    destructive: "#FF453A",
    warn: "#FF9F0A",
    status: "light",
  },
  light: {
    theme: "light",
    bg: "#EEEFF3",
    card: "#FFFFFF",
    cardStrong: "#E6E7EC",
    line: "rgba(60, 60, 67, 0.12)",
    fg: "#111113",
    muted: "#6E6E73",
    accent: "#007AFF",
    iconTile: "#E6E7EC",
    track: "#D8D9DE",
    destructive: "#FF3B30",
    warn: "#FF9F0A",
    status: "dark",
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
      theme: parsed.theme === "light" ? "light" : "dark",
      fontSize: parsed.fontSize === "s" || parsed.fontSize === "l" ? parsed.fontSize : "m",
      chatFontSize:
        parsed.chatFontSize === "s" || parsed.chatFontSize === "l" ? parsed.chatFontSize : "m",
    };
  } catch {
    return { ...DEFAULT_MORPH_APPEARANCE };
  }
}

export async function writeMorphAppearance(next: MorphAppearance): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}
