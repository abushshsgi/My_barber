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
import type { FaceShapeKey } from "@/components/ai-style/ai-style-shared";
import { saveMorphAiGeneration } from "@/lib/morph-ai-gallery";
import { markMorphAiOnboarded } from "@/lib/morph-ai-session";
import type { ExplorePersonaId } from "@/lib/explore-personas";
import { prepareSelfieDataUrl, prepareSelfieFromFile } from "@/lib/selfie-image";
import {
  isMorphPlanLimitError,
  isMorphPlanLimitMessage,
  isMorphRateLimitMessage,
} from "@/lib/morph-plan-limit";
import type { Audience } from "@/lib/mock-data";
import type { AiFaceHint } from "@/lib/api/ai";

type UseAiStyleFlowOptions = {
  menPersonaId?: ExplorePersonaId | null;
  focusStyleId?: string | null;
  audience?: Audience;
  /** false = tarif limiti, API chaqirilmaydi */
  tryOnGate?: (source: "auto" | "manual") => Promise<boolean>;
  /** Try-on muvaffaqiyatidan keyin usage yangilash */
  onTryOnSuccess?: () => void;
  /** API dan plan limit qaytganda (sheet ochish) */
  onPlanLimit?: () => void;
};

function formatAiRequestError(error: unknown, fallback: string): string {
  if (isMorphPlanLimitError(error)) {
    return error.message;
  }
  const raw = error instanceof Error ? error.message : fallback;
  if (isMorphPlanLimitMessage(raw)) {
    return raw;
  }
  if (isMorphRateLimitMessage(raw)) {
    return "Morph AI hozir ishlamayapti. Keyinroq urinib ko'ring.";
  }
  return raw.replace(/\s*Expected available in \d+ seconds?\./gi, "").trim() || raw;
}

export function useAiStyleFlow(options: UseAiStyleFlowOptions = {}) {
  const { menPersonaId, focusStyleId, audience, tryOnGate, onPlanLimit, onTryOnSuccess } = options;
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
  /** Avto try-on muvaffaqiyatsiz bo‘lsa qayta-qayta so‘rov yubormaslik. */
  const tryOnFailedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    analyzeTriggeredRef.current = false;
    autoTryOnRef.current = null;
  }, [focusStyleId]);

  const storePhoto = useCallback(
    async (
      dataUrl: string,
      source: "gallery" | "camera_scan",
      meta?: { faceShapeKey?: FaceShapeKey; scannedAt?: string },
    ) => {
      const prepared = await prepareSelfieDataUrl(dataUrl);
      setPhoto(prepared);
      setDone(false);
      setResult(null);
      setTryOnByStyle({});
      setTryOnLoadingId(null);
      analyzeTriggeredRef.current = false;
      autoTryOnRef.current = null;
      tryOnFailedRef.current.clear();

      const scannedAt = meta?.scannedAt ?? new Date().toISOString();
      appendFaceProfileHistory({
        photoDataUrl: prepared,
        scannedAt,
        source: source === "camera_scan" ? "camera_scan" : "gallery",
        faceShapeKey: meta?.faceShapeKey,
      });
      void persistAiStyleHistory({
        image: prepared,
        source: source === "camera_scan" ? "camera_scan" : "gallery",
        face_shape_key: meta?.faceShapeKey,
      });
      return prepared;
    },
    [],
  );

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
    const scannedAt = new Date().toISOString();
    if (payload.faceShapeKey && payload.ratios) {
      setFaceHint({
        shape: payload.faceShapeKey,
        width_to_height: payload.ratios.widthToHeight,
        jaw_to_forehead: payload.ratios.jawToForehead,
        source: "camera_scan",
      });
      saveFaceProfile({
        faceShapeKey: payload.faceShapeKey,
        ratios: {
          widthToHeight: payload.ratios.widthToHeight,
          jawToForehead: payload.ratios.jawToForehead,
        },
        scannedAt,
        source: "camera_scan",
      });
    } else {
      setFaceHint(null);
    }
    setCameraOpen(false);
    try {
      await storePhoto(payload.dataUrl, "camera_scan", {
        faceShapeKey: payload.faceShapeKey,
        scannedAt,
      });
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
        markMorphAiOnboarded();
      } catch (e) {
        setError(formatAiRequestError(e, "AI tahlil xatosi"));
        setDone(false);
        setResult(null);
      } finally {
        setAnalyzing(false);
      }
    },
    [photo, faceHint, menPersonaId],
  );

  const generateTryOn = useCallback(
    async (
      styleId: string,
      personaId?: ExplorePersonaId,
      title?: string,
      source: "auto" | "manual" = "manual",
    ) => {
      const effectivePersona = personaId ?? menPersonaId ?? undefined;
      const cacheKey = tryOnCacheKey(styleId, effectivePersona);
      if (!photo || tryOnByStyle[cacheKey]) return;
      if (tryOnGate) {
        const allowed = await tryOnGate(source);
        if (!allowed) {
          if (source === "auto") tryOnFailedRef.current.add(cacheKey);
          return;
        }
      }
      // Qo'lda qayta urinish uchun oldingi fail belgisini olib tashlash.
      tryOnFailedRef.current.delete(cacheKey);
      setTryOnLoadingId(cacheKey);
      setError(null);
      try {
        const data = await generateAiStyleTryOn(photo, styleId, effectivePersona);
        setTryOnByStyle((prev) => ({ ...prev, [cacheKey]: data.preview_image }));
        const resolvedTitle =
          title ??
          result?.suggestions.find((s) => s.id === styleId)?.title ??
          styleId;
        saveMorphAiGeneration({
          styleId,
          title: resolvedTitle,
          previewImage: data.preview_image,
          beforeImage: photo,
          personaId: effectivePersona,
        });
        markMorphAiOnboarded();
        onTryOnSuccess?.();
      } catch (e) {
        tryOnFailedRef.current.add(cacheKey);
        if (isMorphPlanLimitError(e)) {
          onPlanLimit?.();
          return;
        }
        setError(formatAiRequestError(e, "Rasm yaratishda xatolik"));
      } finally {
        setTryOnLoadingId(null);
      }
    },
    [photo, tryOnByStyle, menPersonaId, result, tryOnGate, onPlanLimit, onTryOnSuccess],
  );

  const updateTryOnPreview = useCallback((cacheKey: string, previewImage: string) => {
    setTryOnByStyle((prev) => ({ ...prev, [cacheKey]: previewImage }));
    // cacheKey is either styleId or `${personaId}:${styleId}`
    const styleId = cacheKey.includes(":") ? cacheKey.slice(cacheKey.indexOf(":") + 1) : cacheKey;
    const title =
      result?.suggestions.find((s) => s.id === styleId)?.title ?? styleId;
    saveMorphAiGeneration({
      styleId,
      title,
      previewImage,
      beforeImage: photo ?? undefined,
      personaId: menPersonaId ?? undefined,
    });
  }, [photo, result, menPersonaId]);

  useEffect(() => {
    if (!photo || !audience || analyzing || done || analyzeTriggeredRef.current) return;
    analyzeTriggeredRef.current = true;
    void analyze(audience);
  }, [photo, audience, analyzing, done, analyze]);

  useEffect(() => {
    if (!focusStyleId || !photo || autoTryOnRef.current === focusStyleId) return;
    autoTryOnRef.current = focusStyleId;
    void generateTryOn(focusStyleId, undefined, undefined, "auto");
  }, [focusStyleId, photo, generateTryOn]);

  useEffect(() => {
    if (!done || !result?.suggestions.length) return;
    const primary = focusStyleId
      ? result.suggestions.find((s) => s.id === focusStyleId) ?? result.suggestions[0]
      : result.suggestions[0];
    if (!primary) return;
    const primaryKey = tryOnCacheKey(primary.id, menPersonaId);
    if (tryOnByStyle[primaryKey] || tryOnLoadingId === primaryKey) return;
    // Limit / xato bo‘lganda avto-qayta urinish — toast spamni to‘xtatadi.
    if (tryOnFailedRef.current.has(primaryKey)) return;
    void generateTryOn(primary.id, undefined, primary.title, "auto");
  }, [done, result, focusStyleId, tryOnByStyle, tryOnLoadingId, generateTryOn, menPersonaId]);

  const reset = () => {
    analyzeTriggeredRef.current = false;
    autoTryOnRef.current = null;
    tryOnFailedRef.current.clear();
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
    updateTryOnPreview,
    reset,
  };
}
