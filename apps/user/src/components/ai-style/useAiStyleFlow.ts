import { useRef, useState } from "react";
import { analyzeAiStyle } from "@/lib/api";
import type { Audience } from "@/lib/mock-data";
import { mapAiStyleResponse, type AiAnalysisResult } from "@/components/ai-style/ai-style-shared";

export function useAiStyleFlow() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File | null | undefined) => {
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result as string);
      setDone(false);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const openFile = () => fileRef.current?.click();

  const analyze = async (audience: Audience) => {
    if (!photo) return;
    setAnalyzing(true);
    setDone(false);
    setError(null);
    try {
      const data = await analyzeAiStyle(photo, audience);
      setResult(mapAiStyleResponse(data));
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI tahlil xatosi");
      setDone(false);
      setResult(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setPhoto(null);
    setDone(false);
    setResult(null);
    setError(null);
    setAnalyzing(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return {
    photo,
    analyzing,
    done,
    result,
    error,
    fileRef,
    onFile,
    openFile,
    analyze,
    reset,
  };
}
