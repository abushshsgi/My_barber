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
  MORPH_CHAT_FONT_SCALE,
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
  chatFontSize: MorphFontSize;
  fontScale: number;
  chatFontScale: number;
  colors: MorphPalette;
  fs: (size: number) => number;
  chatFs: (size: number) => number;
  setTheme: (theme: MorphThemeName) => void;
  setFontSize: (size: MorphFontSize) => void;
  setChatFontSize: (size: MorphFontSize) => void;
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

  const setChatFontSize = useCallback(
    (chatFontSize: MorphFontSize) => persist({ ...appearance, chatFontSize }),
    [appearance, persist],
  );

  const value = useMemo<MorphAppearanceContextValue>(() => {
    const fontScale = MORPH_FONT_SCALE[appearance.fontSize];
    const chatFontScale = MORPH_CHAT_FONT_SCALE[appearance.chatFontSize];
    return {
      ready,
      theme: appearance.theme,
      fontSize: appearance.fontSize,
      chatFontSize: appearance.chatFontSize,
      fontScale,
      chatFontScale,
      colors: paletteFor(appearance.theme),
      fs: (size: number) => Math.round(size * fontScale),
      chatFs: (size: number) => Math.round(size * chatFontScale),
      setTheme,
      setFontSize,
      setChatFontSize,
    };
  }, [appearance, ready, setChatFontSize, setFontSize, setTheme]);

  return (
    <MorphAppearanceContext.Provider value={value}>{children}</MorphAppearanceContext.Provider>
  );
}

export function useMorphAppearance(): MorphAppearanceContextValue {
  const ctx = useContext(MorphAppearanceContext);
  if (!ctx) {
    const fontScale = MORPH_FONT_SCALE.m;
    const chatFontScale = MORPH_CHAT_FONT_SCALE.m;
    const colors = paletteFor("dark");
    return {
      ready: true,
      theme: "dark",
      fontSize: "m",
      chatFontSize: "m",
      fontScale,
      chatFontScale,
      colors,
      fs: (size: number) => Math.round(size * fontScale),
      chatFs: (size: number) => Math.round(size * chatFontScale),
      setTheme: () => undefined,
      setFontSize: () => undefined,
      setChatFontSize: () => undefined,
    };
  }
  return ctx;
}
