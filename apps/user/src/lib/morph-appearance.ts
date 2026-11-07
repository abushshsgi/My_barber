export type MorphThemeName = "dark" | "light";
export type MorphFontSize = "s" | "m" | "l";

const KEY = "mysaloon.morphAppearance.v1";

export const MORPH_FONT_SCALE: Record<MorphFontSize, number> = {
  s: 0.9,
  m: 1,
  l: 1.16,
};

export type MorphAppearance = {
  theme: MorphThemeName;
  fontSize: MorphFontSize;
};

export const DEFAULT_MORPH_APPEARANCE: MorphAppearance = {
  theme: "light",
  fontSize: "m",
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readMorphAppearance(): MorphAppearance {
  if (!canUseStorage()) return DEFAULT_MORPH_APPEARANCE;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_MORPH_APPEARANCE;
    const parsed = JSON.parse(raw) as Partial<MorphAppearance>;
    const theme = parsed.theme === "dark" ? "dark" : "light";
    const fontSize = parsed.fontSize === "s" || parsed.fontSize === "l" ? parsed.fontSize : "m";
    return { theme, fontSize };
  } catch {
    return DEFAULT_MORPH_APPEARANCE;
  }
}

export function writeMorphAppearance(next: MorphAppearance): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
