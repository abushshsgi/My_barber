import { useEffect, useRef, useState } from "react";
import type { CameraCapturePayload } from "@/components/ai-style/AiStyleCamera";
import { generateAiStyleTryOn } from "@/lib/api";
import type { ExplorePersonaId } from "@/lib/explore-personas";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Rasm o'qib bo'lmadi."));
    reader.readAsDataURL(file);
  });
}

type UseStyleTryOnFlowOptions = {
  styleId: string;
  personaId?: ExplorePersonaId | null;
};

export function useStyleTryOnFlow({ styleId, personaId }: UseStyleTryOnFlowOptions) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [validatingPreview, setValidatingPreview] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tryOnPreview, setTryOnPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const autoTriggeredRef = useRef(false);

  useEffect(() => {
    autoTriggeredRef.current = false;
  }, [styleId]);

  const runTryOn = async (dataUrl: string) => {
    setGenerating(true);
    setError(null);
    try {
      const data = await generateAiStyleTryOn(dataUrl, styleId, personaId ?? undefined);
      setTryOnPreview(data.preview_image);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rasm yaratishda xatolik");
      setTryOnPreview(null);
    } finally {
      setGenerating(false);
    }
  };

  const applyPhoto = async (dataUrl: string) => {
    setError(null);
    setTryOnPreview(null);
    setPhoto(dataUrl);
  };

  useEffect(() => {
    if (!styleId || !photo || validating || autoTriggeredRef.current) return;
    autoTriggeredRef.current = true;
    void runTryOn(photo);
  }, [styleId, photo, validating]);

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

  const onCameraCapture = (payload: CameraCapturePayload) => {
    setError(null);
    setTryOnPreview(null);
    setPhoto(payload.dataUrl);
    setValidating(false);
    setCameraOpen(false);
  };

  const openFile = () => fileRef.current?.click();
  const openCamera = () => setCameraOpen(true);
  const closeCamera = () => setCameraOpen(false);

  const reset = () => {
    autoTriggeredRef.current = false;
    setPhoto(null);
    setTryOnPreview(null);
    setError(null);
    setValidating(false);
    setValidatingPreview(null);
    setGenerating(false);
    setCameraOpen(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const retryGeneration = () => {
    if (!photo) return;
    autoTriggeredRef.current = true;
    setTryOnPreview(null);
    setError(null);
    void runTryOn(photo);
  };

  return {
    photo,
    validatingPreview,
    validating,
    generating,
    tryOnPreview,
    error,
    cameraOpen,
    fileRef,
    onFile,
    onCameraCapture,
    openFile,
    openCamera,
    closeCamera,
    reset,
    retryGeneration,
  };
}
