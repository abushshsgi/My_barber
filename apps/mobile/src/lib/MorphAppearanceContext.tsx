import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_MORPH_APPEARANCE,
  MORPH_FONT_SCALE,
  paletteFor,
  readMorphAppearance,
  writeMorphAppearance,
  type MorphAppearance,
  type MorphFontSize,
  type MorphPalette,
  type MorphThemeName,
} from "../theme/morph-appearance";

type MorphAppearanceContextValue = {
  ready: boolean;
  theme: MorphThemeName;
  fontSize: MorphFontSize;
  fontScale: number;
  colors: MorphPalette;
  fs: (size: number) => number;
  setTheme: (theme: MorphThemeName) => void;
  setFontSize: (size: MorphFontSize) => void;
};

const MorphAppearanceContext = createContext<MorphAppearanceContextValue | null>(null);

export function MorphAppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<MorphAppearance>(DEFAULT_MORPH_APPEARANCE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void readMorphAppearance().then((value) => {
      if (!alive) return;
      setAppearance(value);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback((next: MorphAppearance) => {
    setAppearance(next);
    void writeMorphAppearance(next);
  }, []);

  const setTheme = useCallback(
    (theme: MorphThemeName) => persist({ ...appearance, theme }),
    [appearance, persist],
  );

  const setFontSize = useCallback(
    (fontSize: MorphFontSize) => persist({ ...appearance, fontSize }),
    [appearance, persist],
  );

  const value = useMemo<MorphAppearanceContextValue>(() => {
    const fontScale = MORPH_FONT_SCALE[appearance.fontSize];
    return {
      ready,
      theme: appearance.theme,
      fontSize: appearance.fontSize,
      fontScale,
      colors: paletteFor(appearance.theme),
      fs: (size: number) => Math.round(size * fontScale),
      setTheme,
      setFontSize,
    };
  }, [appearance, ready, setFontSize, setTheme]);

  return (
    <MorphAppearanceContext.Provider value={value}>{children}</MorphAppearanceContext.Provider>
  );
}

export function useMorphAppearance(): MorphAppearanceContextValue {
  const ctx = useContext(MorphAppearanceContext);
  if (!ctx) {
    const fontScale = MORPH_FONT_SCALE.m;
    const colors = paletteFor("dark");
    return {
      ready: true,
      theme: "dark",
      fontSize: "m",
      fontScale,
      colors,
      fs: (size: number) => Math.round(size * fontScale),
      setTheme: () => undefined,
      setFontSize: () => undefined,
    };
  }
  return ctx;
}
