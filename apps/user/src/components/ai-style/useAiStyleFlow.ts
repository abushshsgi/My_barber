import { useRef, useState } from "react";
import { analyzeAiStyle, checkAiStyleFace } from "@/lib/api";
import type { Audience } from "@/lib/mock-data";
import { mapAiStyleResponse, type AiAnalysisResult } from "@/components/ai-style/ai-style-shared";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Rasm o'qib bo'lmadi."));
    reader.readAsDataURL(file);
  });
}

export function useAiStyleFlow() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const applyPhoto = async (dataUrl: string) => {
    setValidating(true);
    setError(null);
    try {
      const check = await checkAiStyleFace(dataUrl);
      if (!check.has_face) {
        throw new Error(check.detail ?? "Iltimos, yuz shakli rasmini yuklang.");
      }
      setPhoto(dataUrl);
      setDone(false);
      setResult(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Yuz tekshirilmadi.";
      setError(message);
      setPhoto(null);
      setDone(false);
      setResult(null);
    } finally {
      setValidating(false);
    }
  };

  const onFile = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      await applyPhoto(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rasm yuklanmadi.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onCameraCapture = (dataUrl: string) => {
    void applyPhoto(dataUrl);
  };

  const openFile = () => fileRef.current?.click();
  const openCamera = () => setCameraOpen(true);
  const closeCamera = () => setCameraOpen(false);

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
    setValidating(false);
    setCameraOpen(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return {
    photo,
    validating,
    analyzing,
    done,
    result,
    error,
    cameraOpen,
    fileRef,
    onFile,
    onCameraCapture,
    openFile,
    openCamera,
    closeCamera,
    analyze,
    reset,
  };
}
