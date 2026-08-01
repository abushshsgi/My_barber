import { useEffect, useRef, useState } from "react";
import type { CameraCapturePayload } from "@/components/ai-style/AiStyleCamera";
import { generateAiStyleTryOn, persistAiStyleHistory } from "@/lib/api";
import type { ExplorePersonaId } from "@/lib/explore-personas";
import { isMorphPlanLimitError } from "@/lib/morph-plan-limit";
import {
  refreshMorphAiGenerationsCache,
  saveMorphAiGeneration,
} from "@/lib/morph-ai-gallery";
import { markMorphAiOnboarded } from "@/lib/morph-ai-session";
import { prepareSelfieDataUrl, prepareSelfieFromFile } from "@/lib/selfie-image";

type UseStyleTryOnFlowOptions = {
  styleId: string;
  styleTitle?: string;
  personaId?: ExplorePersonaId | null;
  beforeTryOn?: (source: "auto" | "manual") => Promise<boolean>;
  onPlanLimit?: () => void;
  onTryOnSuccess?: () => void;
};

/** Strict Mode remount da juft API so'rovini oldini olish. */
const styleTryOnInFlight = new Map<string, Promise<string>>();

function styleTryOnFlightKey(styleId: string, personaId: string | null | undefined, photo: string): string {
  return `${styleId}:${personaId ?? ""}:${photo.length}:${photo.slice(32, 64)}:${photo.slice(-48)}`;
}

function persistExploreTryOnResult(opts: {
  styleId: string;
  styleTitle: string;
  previewImage: string;
  beforeImage: string;
  personaId?: ExplorePersonaId | null;
}) {
  saveMorphAiGeneration({
    styleId: opts.styleId,
    title: opts.styleTitle,
    previewImage: opts.previewImage,
    beforeImage: opts.beforeImage,
    personaId: opts.personaId ?? undefined,
  });
  markMorphAiOnboarded();
  void persistAiStyleHistory({
    image: opts.beforeImage,
    source: "ai_analysis",
  });
  // Server ham saqlaydi — local cache ni DB bilan sinxronlash.
  window.setTimeout(() => {
    void refreshMorphAiGenerationsCache();
  }, 1200);
}

export function useStyleTryOnFlow({
  styleId,
  styleTitle,
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
  const titleRef = useRef(styleTitle ?? styleId);
  titleRef.current = styleTitle ?? styleId;

  useEffect(() => {
    autoTriggeredRef.current = false;
  }, [styleId]);

  const runTryOn = async (dataUrl: string, source: "auto" | "manual" = "manual") => {
    const flightKey = styleTryOnFlightKey(styleId, personaId, dataUrl);
    let run = styleTryOnInFlight.get(flightKey);
    const joinedExisting = Boolean(run);
    if (!run) {
      setGenerating(true);
      setError(null);
      run = (async () => {
        if (beforeTryOn) {
          const ok = await beforeTryOn(source);
          if (!ok) {
            if (source === "auto") autoTriggeredRef.current = true;
            throw new Error("__tryon_gate_blocked__");
          }
        }
        const data = await generateAiStyleTryOn(dataUrl, styleId, personaId ?? undefined);
        return data.preview_image;
      })();
      styleTryOnInFlight.set(flightKey, run);
    } else {
      setGenerating(true);
      setError(null);
    }

    try {
      const preview = await run;
      setTryOnPreview(preview);
      if (!joinedExisting) {
        persistExploreTryOnResult({
          styleId,
          styleTitle: titleRef.current,
          previewImage: preview,
          beforeImage: dataUrl,
          personaId,
        });
        onTryOnSuccess?.();
      }
    } catch (e) {
      if (joinedExisting) return;
      if (e instanceof Error && e.message === "__tryon_gate_blocked__") {
        return;
      }
      if (isMorphPlanLimitError(e)) {
        onPlanLimit?.();
        setTryOnPreview(null);
        return;
      }
      setError(e instanceof Error ? e.message : "Rasm yaratishda xatolik");
      setTryOnPreview(null);
    } finally {
      if (!joinedExisting) styleTryOnInFlight.delete(flightKey);
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
    personaId,
    onFile,
    onCameraCapture,
    openFile,
    openCamera,
    closeCamera,
    reset,
    retryGeneration,
  };
}
