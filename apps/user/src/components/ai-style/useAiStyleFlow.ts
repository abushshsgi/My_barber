import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
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
import { refreshMorphAiGenerationsCache, saveMorphAiGeneration } from "@/lib/morf-ai-gallery";
import { markMorphAiOnboarded } from "@/lib/morf-ai-session";
import type { ExplorePersonaId } from "@/lib/explore-personas";
import { detectFaceMetricsFromDataUrl } from "@/components/ai-style/useFaceLandmarker";
import { prepareSelfieDataUrl, readFileAsDataUrl, validateSelfieFile } from "@/lib/selfie-image";
import { yieldToPaint } from "@/lib/yield-to-paint";
import {
  isMorphPlanLimitError,
  isMorphPlanLimitMessage,
  isMorphRateLimitMessage,
} from "@/lib/morph-plan-limit";
import type { Audience } from "@/lib/mock-data";
import type { AiFaceHint } from "@/lib/api/ai";
import { useActionAuth } from "@/hooks/use-action-auth";
import { isStorageQuotaError, STORAGE_QUOTA_USER_MESSAGE } from "@/lib/storage-quota";

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
  if (isStorageQuotaError(error)) {
    return STORAGE_QUOTA_USER_MESSAGE;
  }
  if (isMorphPlanLimitError(error)) {
    return error.message;
  }
  const raw = error instanceof Error ? error.message : fallback;
  if (isStorageQuotaError(raw)) {
    return STORAGE_QUOTA_USER_MESSAGE;
  }
  if (isMorphPlanLimitMessage(raw)) {
    return raw;
  }
  if (isMorphRateLimitMessage(raw)) {
    return "Morf AI hozir ishlamayapti. Keyinroq urinib ko'ring.";
  }
  return raw.replace(/\s*Expected available in \d+ seconds?\./gi, "").trim() || raw;
}

/** Strict Mode remount / parallel effects — bir xil try-onni ikki marta API ga yubormaslik. */
const tryOnInFlight = new Map<string, Promise<string>>();

function tryOnInFlightKey(photo: string, cacheKey: string): string {
  // photo data-url uzun — bosh/oxir hash yetarli
  return `${cacheKey}:${photo.length}:${photo.slice(32, 64)}:${photo.slice(-48)}`;
}

export function useAiStyleFlow(options: UseAiStyleFlowOptions = {}) {
  const { menPersonaId, focusStyleId, audience, tryOnGate, onPlanLimit, onTryOnSuccess } = options;
  const allowAction = useActionAuth();
  const [photo, setPhoto] = useState<string | null>(null);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [preparingPreview, setPreparingPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [summaryReady, setSummaryReady] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [faceHint, setFaceHint] = useState<AiFaceHint | null>(null);
  const [tryOnByStyle, setTryOnByStyle] = useState<Record<string, string>>({});
  const [tryOnLoadingId, setTryOnLoadingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const analyzeTriggeredRef = useRef(false);
  /** Avto try-on bir marta (cacheKey) — tahlil tugagach. */
  const autoTryOnStartedRef = useRef<string | null>(null);
  /** Avto try-on muvaffaqiyatsiz bo‘lsa qayta-qayta so‘rov yubormaslik. */
  const tryOnFailedRef = useRef<Set<string>>(new Set());
  const inputSourceRef = useRef<"camera" | "gallery">("gallery");

  useEffect(() => {
    analyzeTriggeredRef.current = false;
    autoTryOnStartedRef.current = null;
  }, [focusStyleId]);

  const storePhoto = useCallback(
    async (
      dataUrl: string,
      source: "gallery" | "camera_scan",
      meta?: { faceShapeKey?: FaceShapeKey; scannedAt?: string },
    ) => {
      const prepared = dataUrl;
      inputSourceRef.current = source === "camera_scan" ? "camera" : "gallery";
      setPhoto(prepared);
      setDone(false);
      setSummaryReady(false);
      setResult(null);
      setTryOnByStyle({});
      setTryOnLoadingId(null);
      analyzeTriggeredRef.current = false;
      autoTryOnStartedRef.current = null;
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

  const applyPhoto = async (dataUrl: string, source: "gallery" | "camera_scan") => {
    setPreparingPreview(dataUrl);
    setPreparingPhoto(true);
    setError(null);
    await yieldToPaint();
    try {
      const prepared = await prepareSelfieDataUrl(dataUrl, { checkQuality: true });
      const metricsFace = await Promise.race([
        detectFaceMetricsFromDataUrl(prepared).catch(() => null),
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 280)),
      ]);
      if (metricsFace) {
        const scannedAt = new Date().toISOString();
        setFaceHint({
          shape: metricsFace.faceShapeKey,
          width_to_height: metricsFace.ratios.widthToHeight,
          jaw_to_forehead: metricsFace.ratios.jawToForehead,
          source: "camera_scan",
        });
        saveFaceProfile({
          faceShapeKey: metricsFace.faceShapeKey,
          ratios: {
            widthToHeight: metricsFace.ratios.widthToHeight,
            jawToForehead: metricsFace.ratios.jawToForehead,
          },
          scannedAt,
          source: "camera_scan",
        });
        await storePhoto(prepared, source, {
          faceShapeKey: metricsFace.faceShapeKey,
          scannedAt,
        });
      } else {
        setFaceHint(null);
        await storePhoto(prepared, source);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Rasm yuklanmadi.";
      setError(message);
      setPhoto(null);
      setDone(false);
      setSummaryReady(false);
      setResult(null);
    } finally {
      setPreparingPhoto(false);
      setPreparingPreview(null);
    }
  };

  const onFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (!allowAction()) return;
    try {
      const validationError = validateSelfieFile(file);
      if (validationError) throw new Error(validationError);
      const dataUrl = await readFileAsDataUrl(file);
      await applyPhoto(dataUrl, "gallery");
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
      await applyPhoto(payload.dataUrl, "camera_scan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rasm yuklanmadi.");
    }
  };

  const openFile = () => {
    if (!allowAction()) return;
    fileRef.current?.click();
  };
  const openCamera = () => {
    if (!allowAction()) return;
    setCameraOpen(true);
  };
  const closeCamera = () => setCameraOpen(false);

  const analyze = useCallback(
    async (targetAudience: Audience) => {
      if (!photo) return;
      if (!allowAction()) return;
      setAnalyzing(true);
      setDone(false);
      setSummaryReady(false);
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
        if (typeof window !== "undefined") {
          for (const suggestion of mapped.suggestions) {
            if (!suggestion.imageUrl) continue;
            const warmer = new window.Image();
            warmer.decoding = "async";
            warmer.src = suggestion.imageUrl;
          }
        }
        setSummaryReady(true);
        markMorphAiOnboarded();
      } catch (e) {
        setError(formatAiRequestError(e, "AI tahlil xatosi"));
        setDone(false);
        setSummaryReady(false);
        setResult(null);
      } finally {
        setAnalyzing(false);
      }
    },
    [photo, faceHint, menPersonaId, allowAction],
  );

  const generateTryOn = useCallback(
    async (
      styleId: string,
      personaId?: ExplorePersonaId,
      title?: string,
      source: "auto" | "manual" = "manual",
    ) => {
      if (!allowAction()) return;
      const effectivePersona = personaId ?? menPersonaId ?? undefined;
      const cacheKey = tryOnCacheKey(styleId, effectivePersona);
      if (!photo || tryOnByStyle[cacheKey]) return;

      const flightKey = tryOnInFlightKey(photo, cacheKey);
      let run = tryOnInFlight.get(flightKey);
      const joinedExisting = Boolean(run);
      if (!run) {
        // Loading + in-flight — await dan OLDIN (gate race / Strict Mode).
        tryOnFailedRef.current.delete(cacheKey);
        setTryOnLoadingId(cacheKey);
        setError(null);
        run = (async () => {
          if (tryOnGate) {
            const allowed = await tryOnGate(source);
            if (!allowed) {
              if (source === "auto") tryOnFailedRef.current.add(cacheKey);
              throw new Error("__tryon_gate_blocked__");
            }
          }
          trackEvent("ai_style_selected", { style_id: styleId, source });
          trackEvent("ai_generation_requested", { style_id: styleId, source });
          const data = await generateAiStyleTryOn(
            photo,
            styleId,
            effectivePersona,
            inputSourceRef.current,
          );
          const preview = data.preview_image;
          if (!preview || preview === photo || preview === (photo || "").split("?")[0]) {
            throw new Error("Rasm yaratilmadi. Qayta urinib ko'ring.");
          }
          return preview;
        })();
        tryOnInFlight.set(flightKey, run);
      } else {
        setTryOnLoadingId(cacheKey);
      }

      try {
        const previewImage = await run;
        setTryOnByStyle((prev) => ({ ...prev, [cacheKey]: previewImage }));
        setTryOnLoadingId(null);
        if (!joinedExisting) {
          trackEvent("ai_generation_completed", { style_id: styleId });
          const resolvedTitle =
            title ?? result?.suggestions.find((s) => s.id === styleId)?.title ?? styleId;
          // Server try-on tugaganda historyga yozadi — remote POST qilmaslik (duplicate).
          try {
            saveMorphAiGeneration({
              styleId,
              title: resolvedTitle,
              previewImage,
              personaId: effectivePersona,
              syncRemote: false,
            });
          } catch {
            /* gallery cache — try-on natijasi ekranda qoladi */
          }
          window.setTimeout(() => {
            void refreshMorphAiGenerationsCache();
          }, 1200);
          markMorphAiOnboarded();
          onTryOnSuccess?.();
        }
      } catch (e) {
        if (e instanceof Error && e.message === "__tryon_gate_blocked__") {
          return;
        }
        if (joinedExisting) return;
        tryOnFailedRef.current.add(cacheKey);
        if (isMorphPlanLimitError(e)) {
          onPlanLimit?.();
          return;
        }
        trackEvent("ai_generation_failed", { style_id: styleId });
        setError(formatAiRequestError(e, "Rasm yaratishda xatolik"));
      } finally {
        if (!joinedExisting) tryOnInFlight.delete(flightKey);
        setTryOnLoadingId(null);
      }
    },
    [photo, tryOnByStyle, menPersonaId, result, tryOnGate, onPlanLimit, onTryOnSuccess, allowAction],
  );

  const updateTryOnPreview = useCallback(
    (cacheKey: string, previewImage: string) => {
      setTryOnByStyle((prev) => ({ ...prev, [cacheKey]: previewImage }));
      // cacheKey is either styleId or `${personaId}:${styleId}`
      const styleId = cacheKey.includes(":") ? cacheKey.slice(cacheKey.indexOf(":") + 1) : cacheKey;
      const title = result?.suggestions.find((s) => s.id === styleId)?.title ?? styleId;
      try {
        saveMorphAiGeneration({
          styleId,
          title,
          previewImage,
          personaId: menPersonaId ?? undefined,
          syncRemote: false,
        });
      } catch {
        /* ignore cache quota */
      }
      window.setTimeout(() => {
        void refreshMorphAiGenerationsCache();
      }, 1200);
    },
    [photo, result, menPersonaId],
  );

  const acceptSummary = useCallback(() => {
    if (!result) return;
    setDone(true);
    setSummaryReady(false);
  }, [result]);

  useEffect(() => {
    if (!photo || !audience || analyzing || done || summaryReady || analyzeTriggeredRef.current) return;
    analyzeTriggeredRef.current = true;
    void analyze(audience);
  }, [photo, audience, analyzing, done, summaryReady, analyze]);

  const reset = () => {
    analyzeTriggeredRef.current = false;
    autoTryOnStartedRef.current = null;
    tryOnFailedRef.current.clear();
    setPhoto(null);
    setDone(false);
    setSummaryReady(false);
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
    summaryReady,
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
    acceptSummary,
    generateTryOn,
    updateTryOnPreview,
    reset,
  };
}
