import { useEffect, useRef, useState } from "react";
import { analyzeAiStyle, checkAiStyleFace, generateAiStyleTryOn, persistAiStyleHistory } from "@/lib/api";
import type { CameraCapturePayload } from "@/components/ai-style/AiStyleCamera";
import { mapAiStyleResponse, type AiAnalysisResult } from "@/components/ai-style/ai-style-shared";
import {
  appendFaceProfileHistory,
  enrichLatestFaceProfileHistory,
  saveFaceProfile,
} from "@/lib/face-profile";
import type { ExplorePersonaId } from "@/lib/explore-personas";
import type { Audience } from "@/lib/mock-data";
import type { AiFaceHint } from "@/lib/api/ai";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Rasm o'qib bo'lmadi."));
    reader.readAsDataURL(file);
  });
}

type UseAiStyleFlowOptions = {
  menPersonaId?: ExplorePersonaId | null;
  focusStyleId?: string | null;
  audience?: Audience;
};

export function useAiStyleFlow(options: UseAiStyleFlowOptions = {}) {
  const { menPersonaId, focusStyleId, audience } = options;
  const [photo, setPhoto] = useState<string | null>(null);
  const [validatingPreview, setValidatingPreview] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [faceHint, setFaceHint] = useState<AiFaceHint | null>(null);
  const [tryOnByStyle, setTryOnByStyle] = useState<Record<string, string>>({});
  const [tryOnLoadingId, setTryOnLoadingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const autoTriggeredRef = useRef(false);

  useEffect(() => {
    autoTriggeredRef.current = false;
  }, [focusStyleId]);

  const applyPhoto = async (dataUrl: string) => {
    setValidatingPreview(dataUrl);
    setValidating(true);
    setError(null);
    try {
      const check = await checkAiStyleFace(dataUrl);
      if (!check.has_face) {
        throw new Error(check.detail ?? "Iltimos, yuz shakli rasmini yuklang.");
      }
      setPhoto(dataUrl);
      const scannedAt = new Date().toISOString();
      appendFaceProfileHistory({
        photoDataUrl: dataUrl,
        scannedAt,
        source: "gallery",
      });
      void persistAiStyleHistory({
        image: dataUrl,
        source: "gallery",
      });
      setFaceHint(null);
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
      setValidatingPreview(null);
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

  const onCameraCapture = (payload: CameraCapturePayload) => {
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
    setPhoto(payload.dataUrl);
    setDone(false);
    setResult(null);
    setValidating(false);
    setCameraOpen(false);
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
      const data = await analyzeAiStyle(
        photo,
        audience,
        faceHint,
        audience === "men" ? (menPersonaId ?? undefined) : undefined,
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
  };

  const generateTryOn = async (styleId: string) => {
    if (!photo) return;
    if (tryOnByStyle[styleId]) return;
    setTryOnLoadingId(styleId);
    setError(null);
    try {
      const data = await generateAiStyleTryOn(
        photo,
        styleId,
        menPersonaId ?? undefined,
      );
      setTryOnByStyle((prev) => ({ ...prev, [styleId]: data.preview_image }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rasm yaratishda xatolik");
    } finally {
      setTryOnLoadingId(null);
    }
  };

  useEffect(() => {
    if (!focusStyleId || !photo || validating || autoTriggeredRef.current) return;
    autoTriggeredRef.current = true;
    void generateTryOn(focusStyleId);
    if (audience) {
      void analyze(audience);
    }
  }, [focusStyleId, photo, validating, audience]);

  const reset = () => {
    autoTriggeredRef.current = false;
    setPhoto(null);
    setDone(false);
    setResult(null);
    setError(null);
    setAnalyzing(false);
    setValidating(false);
    setValidatingPreview(null);
    setCameraOpen(false);
    setFaceHint(null);
    setTryOnByStyle({});
    setTryOnLoadingId(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return {
    photo,
    validatingPreview,
    validating,
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
