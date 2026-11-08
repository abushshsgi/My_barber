import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_MORPH_APPEARANCE,
  applyAppearanceToDocument,
  readMorphAppearance,
  writeMorphAppearance,
  type MorphAppearance,
  type MorphFontSize,
  type MorphThemeName,
} from "@/lib/morph-appearance";

export function useMorphAppearance() {
  const [appearance, setAppearance] = useState<MorphAppearance>(DEFAULT_MORPH_APPEARANCE);

  useEffect(() => {
    const current = readMorphAppearance();
    setAppearance(current);
    applyAppearanceToDocument(current);
  }, []);

  const setTheme = useCallback((theme: MorphThemeName) => {
    setAppearance((prev) => {
      const next = { ...prev, theme };
      writeMorphAppearance(next);
      return next;
    });
  }, []);

  const setFontSize = useCallback((fontSize: MorphFontSize) => {
    setAppearance((prev) => {
      const next = { ...prev, fontSize };
      writeMorphAppearance(next);
      return next;
    });
  }, []);

  return { appearance, setTheme, setFontSize };
}
