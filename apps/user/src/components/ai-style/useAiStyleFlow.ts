import { useRef, useState } from "react";
import type { Audience } from "@/lib/mock-data";
import {
  ANALYZE_MS,
  buildAnalysis,
  type AiAnalysisResult,
} from "@/components/ai-style/ai-style-shared";

export function useAiStyleFlow() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File | null | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result as string);
      setDone(false);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const openFile = () => fileRef.current?.click();

  const analyze = (audience: Audience) => {
    if (!photo) return;
    setAnalyzing(true);
    setDone(false);
    window.setTimeout(() => {
      setResult(buildAnalysis(audience));
      setAnalyzing(false);
      setDone(true);
    }, ANALYZE_MS);
  };

  const reset = () => {
    setPhoto(null);
    setDone(false);
    setResult(null);
    setAnalyzing(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return {
    photo,
    analyzing,
    done,
    result,
    fileRef,
    onFile,
    openFile,
    analyze,
    reset,
  };
}
