import { useEffect, useRef, useState } from "react";
import type { CameraCapturePayload } from "@/components/ai-style/AiStyleCamera";
import { generateAiStyleTryOn } from "@/lib/api";
import type { ExplorePersonaId } from "@/lib/explore-personas";
import { isMorphPlanLimitError } from "@/lib/morph-plan-limit";
import { prepareSelfieDataUrl, prepareSelfieFromFile } from "@/lib/selfie-image";

type UseStyleTryOnFlowOptions = {
  styleId: string;
  personaId?: ExplorePersonaId | null;
  beforeTryOn?: (source: "auto" | "manual") => Promise<boolean>;
  onPlanLimit?: () => void;
  onTryOnSuccess?: () => void;
};

export function useStyleTryOnFlow({
  styleId,
  personaId,
  beforeTryOn,
  onPlanLimit,
  onTryOnSuccess,
}: UseStyleTryOnFlowOptions) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [preparingPreview, setPreparingPreview] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tryOnPreview, setTryOnPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const autoTriggeredRef = useRef(false);

  useEffect(() => {
    autoTriggeredRef.current = false;
  }, [styleId]);

  const runTryOn = async (dataUrl: string, source: "auto" | "manual" = "manual") => {
    if (beforeTryOn) {
      const ok = await beforeTryOn(source);
      if (!ok) {
        if (source === "auto") autoTriggeredRef.current = true;
        return;
      }
    }
    setGenerating(true);
    setError(null);
    try {
      const data = await generateAiStyleTryOn(dataUrl, styleId, personaId ?? undefined);
      setTryOnPreview(data.preview_image);
      onTryOnSuccess?.();
    } catch (e) {
      if (isMorphPlanLimitError(e)) {
        onPlanLimit?.();
        setTryOnPreview(null);
        return;
      }
      setError(e instanceof Error ? e.message : "Rasm yaratishda xatolik");
      setTryOnPreview(null);
    } finally {
      setGenerating(false);
    }
  };

  const applyPhoto = async (dataUrl: string) => {
    setPreparingPreview(dataUrl);
    setPreparing(true);
    setError(null);
    setTryOnPreview(null);
    try {
      const prepared = await prepareSelfieDataUrl(dataUrl);
      setPhoto(prepared);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rasm yuklanmadi.");
      setPhoto(null);
    } finally {
      setPreparing(false);
      setPreparingPreview(null);
    }
  };

  useEffect(() => {
    if (!styleId || !photo || preparing || autoTriggeredRef.current) return;
    autoTriggeredRef.current = true;
    void runTryOn(photo, "auto");
  }, [styleId, photo, preparing]);

  const onFile = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await prepareSelfieFromFile(file);
      await applyPhoto(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rasm yuklanmadi.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onCameraCapture = (payload: CameraCapturePayload) => {
    setCameraOpen(false);
    void applyPhoto(payload.dataUrl);
  };

  const openFile = () => fileRef.current?.click();
  const openCamera = () => setCameraOpen(true);
  const closeCamera = () => setCameraOpen(false);

  const reset = () => {
    autoTriggeredRef.current = false;
    setPhoto(null);
    setTryOnPreview(null);
    setError(null);
    setPreparing(false);
    setPreparingPreview(null);
    setGenerating(false);
    setCameraOpen(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const retryGeneration = () => {
    if (!photo) return;
    autoTriggeredRef.current = true;
    setTryOnPreview(null);
    setError(null);
    void runTryOn(photo, "manual");
  };

  return {
    photo,
    validatingPreview: preparingPreview,
    validating: preparing,
    generating,
    tryOnPreview,
    setTryOnPreview,
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
