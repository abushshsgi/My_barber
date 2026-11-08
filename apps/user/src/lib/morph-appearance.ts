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

export function applyAppearanceToDocument(next: MorphAppearance): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", next.theme === "dark");
  root.setAttribute("data-morph-theme", next.theme);
  root.style.setProperty("--morph-font-scale", String(MORPH_FONT_SCALE[next.fontSize]));
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", next.theme === "dark" ? "#0a0a0a" : "#ffffff");
}

export function writeMorphAppearance(next: MorphAppearance): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  applyAppearanceToDocument(next);
}

/** FOUC oldini olish — html class dark ni paint dan oldin qo‘yadi. */
export const APPEARANCE_BOOT_SCRIPT = `(function(){try{var r=JSON.parse(localStorage.getItem("mysaloon.morphAppearance.v1")||"{}");var d=r.theme==="dark";var el=document.documentElement;el.classList.toggle("dark",d);el.setAttribute("data-morph-theme",d?"dark":"light");var s=r.fontSize==="s"?0.9:r.fontSize==="l"?1.16:1;el.style.setProperty("--morph-font-scale",String(s));var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",d?"#0a0a0a":"#ffffff");}catch(e){}})();`;
