import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { AiStyleAnalyzeResponse } from "../api/ai";

type MorphSession = {
  selfieDataUrl: string | null;
  analyze: AiStyleAnalyzeResponse | null;
  tryOnPreview: string | null;
  tryOnStyleId: string | null;
  tryOnTitle: string | null;
  /** styleId → generated preview (web tryOnByStyle kabi). */
  tryOnByStyle: Record<string, string>;
  preferredStyleId: string | null;
  preferredStyleTitle: string | null;
  setSelfie: (uri: string | null) => void;
  setAnalyze: (data: AiStyleAnalyzeResponse | null) => void;
  setTryOn: (preview: string | null, styleId?: string | null, title?: string | null) => void;
  setPreferredStyle: (styleId: string | null, title?: string | null) => void;
  clear: () => void;
};

const Ctx = createContext<MorphSession | null>(null);

export function MorphSessionProvider({ children }: { children: ReactNode }) {
  const [selfieDataUrl, setSelfie] = useState<string | null>(null);
  const [analyze, setAnalyze] = useState<AiStyleAnalyzeResponse | null>(null);
  const [tryOnPreview, setTryOnPreview] = useState<string | null>(null);
  const [tryOnStyleId, setTryOnStyleId] = useState<string | null>(null);
  const [tryOnTitle, setTryOnTitle] = useState<string | null>(null);
  const [tryOnByStyle, setTryOnByStyle] = useState<Record<string, string>>({});
  const [preferredStyleId, setPreferredStyleId] = useState<string | null>(null);
  const [preferredStyleTitle, setPreferredStyleTitle] = useState<string | null>(null);

  const value = useMemo<MorphSession>(
    () => ({
      selfieDataUrl,
      analyze,
      tryOnPreview,
      tryOnStyleId,
      tryOnTitle,
      tryOnByStyle,
      preferredStyleId,
      preferredStyleTitle,
      setSelfie,
      setAnalyze,
      setTryOn: (preview, styleId = null, title = null) => {
        setTryOnPreview(preview);
        setTryOnStyleId(styleId);
        setTryOnTitle(title);
        if (preview && styleId) {
          setTryOnByStyle((prev) => ({ ...prev, [styleId]: preview }));
        }
      },
      setPreferredStyle: (styleId, title = null) => {
        setPreferredStyleId(styleId);
        setPreferredStyleTitle(title);
      },
      clear: () => {
        setSelfie(null);
        setAnalyze(null);
        setTryOnPreview(null);
        setTryOnStyleId(null);
        setTryOnTitle(null);
        setTryOnByStyle({});
        setPreferredStyleId(null);
        setPreferredStyleTitle(null);
      },
    }),
    [
      selfieDataUrl,
      analyze,
      tryOnPreview,
      tryOnStyleId,
      tryOnTitle,
      tryOnByStyle,
      preferredStyleId,
      preferredStyleTitle,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMorphSession(): MorphSession {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMorphSession outside provider");
  return ctx;
}
