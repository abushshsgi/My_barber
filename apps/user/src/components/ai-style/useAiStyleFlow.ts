import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeAiStyle, generateAiStyleTryOn, persistAiStyleHistory } from "@/lib/api";
import type { CameraCapturePayload } from "@/components/ai-style/AiStyleCamera";
import {
  mapAiStyleResponse,
  tryOnCacheKey,
  type AiAnalysisResult,
} from "@/components/ai-style/ai-style-shared";
import {
  appendFaceProfileHistory,
  enrichLatestFaceProfileHistory,
  saveFaceProfile,
} from "@/lib/face-profile";
import type { ExplorePersonaId } from "@/lib/explore-personas";
import { prepareSelfieDataUrl, prepareSelfieFromFile } from "@/lib/selfie-image";
import type { Audience } from "@/lib/mock-data";
import type { AiFaceHint } from "@/lib/api/ai";

type UseAiStyleFlowOptions = {
  menPersonaId?: ExplorePersonaId | null;
  focusStyleId?: string | null;
  audience?: Audience;
};

export function useAiStyleFlow(options: UseAiStyleFlowOptions = {}) {
  const { menPersonaId, focusStyleId, audience } = options;
  const [photo, setPhoto] = useState<string | null>(null);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [preparingPreview, setPreparingPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [faceHint, setFaceHint] = useState<AiFaceHint | null>(null);
  const [tryOnByStyle, setTryOnByStyle] = useState<Record<string, string>>({});
  const [tryOnLoadingId, setTryOnLoadingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const analyzeTriggeredRef = useRef(false);
  const autoTryOnRef = useRef<string | null>(null);

  useEffect(() => {
    analyzeTriggeredRef.current = false;
    autoTryOnRef.current = null;
  }, [focusStyleId]);

  const storePhoto = useCallback(async (dataUrl: string, source: "gallery" | "camera_scan") => {
    const prepared = await prepareSelfieDataUrl(dataUrl);
    setPhoto(prepared);
    setDone(false);
    setResult(null);
    setTryOnByStyle({});
    setTryOnLoadingId(null);
    analyzeTriggeredRef.current = false;
    autoTryOnRef.current = null;

    const scannedAt = new Date().toISOString();
    appendFaceProfileHistory({
      photoDataUrl: prepared,
      scannedAt,
      source: source === "camera_scan" ? "camera_scan" : "gallery",
    });
    void persistAiStyleHistory({
      image: prepared,
      source: source === "camera_scan" ? "camera_scan" : "gallery",
    });
  }, []);

  const applyPhoto = async (dataUrl: string) => {
    setPreparingPreview(dataUrl);
    setPreparingPhoto(true);
    setError(null);
    try {
      await storePhoto(dataUrl, "gallery");
      setFaceHint(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Rasm yuklanmadi.";
      setError(message);
      setPhoto(null);
      setDone(false);
      setResult(null);
    } finally {
      setPreparingPhoto(false);
      setPreparingPreview(null);
    }
  };

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

  const onCameraCapture = async (payload: CameraCapturePayload) => {
    setError(null);
    setFaceHint({
      shape: payload.faceShapeKey,
      width_to_height: payload.ratios.widthToHeight,
      jaw_to_forehead: payload.ratios.jawToForehead,
      source: "camera_scan",
    });
    const scannedAt = new Date().toISOString();
    saveFaceProfile({
      faceShapeKey: payload.faceShapeKey,
      ratios: {
        widthToHeight: payload.ratios.widthToHeight,
        jawToForehead: payload.ratios.jawToForehead,
      },
      scannedAt,
      source: "camera_scan",
    });
    appendFaceProfileHistory({
      photoDataUrl: payload.dataUrl,
      faceShapeKey: payload.faceShapeKey,
      scannedAt,
      source: "camera_scan",
    });
    void persistAiStyleHistory({
      image: payload.dataUrl,
      face_shape_key: payload.faceShapeKey,
      source: "camera_scan",
    });
    setCameraOpen(false);
    try {
      await storePhoto(payload.dataUrl, "camera_scan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rasm yuklanmadi.");
    }
  };

  const openFile = () => fileRef.current?.click();
  const openCamera = () => setCameraOpen(true);
  const closeCamera = () => setCameraOpen(false);

  const analyze = useCallback(
    async (targetAudience: Audience) => {
      if (!photo) return;
      setAnalyzing(true);
      setDone(false);
      setError(null);
      try {
        const data = await analyzeAiStyle(
          photo,
          targetAudience,
          faceHint,
          targetAudience === "men" ? (menPersonaId ?? undefined) : undefined,
        );
        const mapped = mapAiStyleResponse(data);
        if (faceHint) {
          mapped.faceShapeKey = faceHint.shape;
        }
        const scannedAt = new Date().toISOString();
        const source = faceHint ? "camera_scan" : "ai_analysis";
        saveFaceProfile({
          faceShapeKey: mapped.faceShapeKey,
          hairTypeKey: mapped.hairTypeKey,
          ratios: {
            widthToHeight: faceHint?.width_to_height ?? 0,
            jawToForehead: faceHint?.jaw_to_forehead ?? 0,
          },
          scannedAt,
          source,
        });
        enrichLatestFaceProfileHistory(photo, {
          faceShapeKey: mapped.faceShapeKey,
          hairTypeKey: mapped.hairTypeKey,
          scannedAt,
          source,
        });
        void persistAiStyleHistory({
          face_shape_key: mapped.faceShapeKey,
          hair_type_key: mapped.hairTypeKey,
          source,
          replace_latest: true,
        });
        setResult(mapped);
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "AI tahlil xatosi");
        setDone(false);
        setResult(null);
      } finally {
        setAnalyzing(false);
      }
    },
    [photo, faceHint, menPersonaId],
  );

  const generateTryOn = useCallback(
    async (styleId: string, personaId?: ExplorePersonaId) => {
      const effectivePersona = personaId ?? menPersonaId ?? undefined;
      const cacheKey = tryOnCacheKey(styleId, effectivePersona);
      if (!photo || tryOnByStyle[cacheKey]) return;
      setTryOnLoadingId(cacheKey);
      setError(null);
      try {
        const data = await generateAiStyleTryOn(photo, styleId, effectivePersona);
        setTryOnByStyle((prev) => ({ ...prev, [cacheKey]: data.preview_image }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Rasm yaratishda xatolik");
      } finally {
        setTryOnLoadingId(null);
      }
    },
    [photo, tryOnByStyle, menPersonaId],
  );

  useEffect(() => {
    if (!photo || !audience || analyzing || done || analyzeTriggeredRef.current) return;
    analyzeTriggeredRef.current = true;
    void analyze(audience);
  }, [photo, audience, analyzing, done, analyze]);

  useEffect(() => {
    if (!focusStyleId || !photo || autoTryOnRef.current === focusStyleId) return;
    autoTryOnRef.current = focusStyleId;
    void generateTryOn(focusStyleId);
  }, [focusStyleId, photo, generateTryOn]);

  useEffect(() => {
    if (!done || !result?.suggestions.length) return;
    const primaryId = focusStyleId ?? result.suggestions[0]?.id;
    const primaryKey = tryOnCacheKey(primaryId, menPersonaId);
    if (!primaryId || tryOnByStyle[primaryKey] || tryOnLoadingId === primaryKey) return;
    void generateTryOn(primaryId);
  }, [done, result, focusStyleId, tryOnByStyle, tryOnLoadingId, generateTryOn]);

  const reset = () => {
    analyzeTriggeredRef.current = false;
    autoTryOnRef.current = null;
    setPhoto(null);
    setDone(false);
    setResult(null);
    setError(null);
    setAnalyzing(false);
    setPreparingPhoto(false);
    setPreparingPreview(null);
    setCameraOpen(false);
    setFaceHint(null);
    setTryOnByStyle({});
    setTryOnLoadingId(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return {
    photo,
    validatingPreview: preparingPreview,
    validating: preparingPhoto,
    analyzing,
    done,
    result,
    error,
    cameraOpen,
    faceHint,
    tryOnByStyle,
    tryOnLoadingId,
    fileRef,
    onFile,
    onCameraCapture,
    openFile,
    openCamera,
    closeCamera,
    analyze,
    generateTryOn,
    reset,
  };
}
