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

export type MorphAppearance = {
  theme: MorphThemeName;
  fontSize: MorphFontSize;
};

export const DEFAULT_MORPH_APPEARANCE: MorphAppearance = {
  theme: "dark",
  fontSize: "m",
};

export const MORPH_PALETTES: Record<MorphThemeName, MorphPalette> = {
  dark: {
    theme: "dark",
    bg: "#000000",
    card: "#1C1C1E",
    cardStrong: "#2C2C2E",
    line: "rgba(84, 84, 88, 0.65)",
    fg: "#FFFFFF",
    muted: "#8E8E93",
    accent: "#0A84FF",
    iconTile: "#2C2C2E",
    track: "#2C2C2E",
    destructive: "#FF453A",
    warn: "#FF9F0A",
    status: "light",
  },
  light: {
    theme: "light",
    bg: "#F2F2F7",
    card: "#FFFFFF",
    cardStrong: "#E5E5EA",
    line: "rgba(60, 60, 67, 0.18)",
    fg: "#000000",
    muted: "#8E8E93",
    accent: "#0A84FF",
    iconTile: "#E5E5EA",
    track: "#E5E5EA",
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
    };
  } catch {
    return { ...DEFAULT_MORPH_APPEARANCE };
  }
}

export async function writeMorphAppearance(next: MorphAppearance): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}
