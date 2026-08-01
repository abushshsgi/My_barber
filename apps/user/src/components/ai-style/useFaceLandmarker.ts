import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useEffect, useRef, useState } from "react";
import {
  metricsFromLandmarks,
  type FaceFrameMetrics,
} from "@/components/ai-style/face-scan-utils";

const MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

let visionPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null;
let videoLandmarkerPromise: Promise<FaceLandmarker> | null = null;
let imageLandmarkerPromise: Promise<FaceLandmarker> | null = null;

function loadVision() {
  if (!visionPromise) {
    visionPromise = FilesetResolver.forVisionTasks(WASM);
  }
  return visionPromise;
}

async function createLandmarker(
  delegate: "GPU" | "CPU",
  runningMode: "VIDEO" | "IMAGE",
) {
  const vision = await loadVision();
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL, delegate },
    runningMode,
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });
}

function loadVideoLandmarker() {
  if (!videoLandmarkerPromise) {
    videoLandmarkerPromise = createLandmarker("GPU", "VIDEO").catch(() =>
      createLandmarker("CPU", "VIDEO"),
    );
  }
  return videoLandmarkerPromise;
}

function loadImageLandmarker() {
  if (!imageLandmarkerPromise) {
    imageLandmarkerPromise = createLandmarker("GPU", "IMAGE").catch(() =>
      createLandmarker("CPU", "IMAGE"),
    );
  }
  return imageLandmarkerPromise;
}

/** Morph AI ochilganda modelni oldindan yuklash — kamerani kutishni qisqartiradi. */
export function prefetchFaceLandmarker() {
  if (typeof window === "undefined") return;
  void loadVideoLandmarker().catch(() => undefined);
  void loadImageLandmarker().catch(() => undefined);
}

export async function detectFaceMetricsFromDataUrl(
  dataUrl: string,
): Promise<FaceFrameMetrics | null> {
  if (typeof document === "undefined" || !dataUrl) return null;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("image_load_failed"));
    el.src = dataUrl;
  });

  const landmarker = await loadImageLandmarker();
  const result = landmarker.detect(img);
  const landmarks = result.faceLandmarks?.[0];
  if (!landmarks) return null;
  return metricsFromLandmarks(landmarks);
}

export function useFaceLandmarker(enabled: boolean) {
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    void loadVideoLandmarker()
      .then((lm) => {
        if (cancelled) return;
        landmarkerRef.current = lm;
        setReady(true);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setReady(false);
          setError("face_scan_load_failed");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { landmarkerRef, ready, error };
}
