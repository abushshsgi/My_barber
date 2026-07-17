import { Camera, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  metricsFromLandmarks,
  smoothMetrics,
  type FaceFrameMetrics,
} from "@/components/ai-style/face-scan-utils";
import { useFaceLandmarker } from "@/components/ai-style/useFaceLandmarker";
import type { FaceShapeKey } from "@/components/ai-style/ai-style-shared";
import { cn } from "@/lib/utils";

const FACE_CAMERA_ATTR = "data-face-camera";

export type CameraCapturePayload = {
  dataUrl: string;
  faceShapeKey?: FaceShapeKey;
  ratios?: { widthToHeight: number; jawToForehead: number };
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (payload: CameraCapturePayload) => void;
};

export function AiStyleCamera({ open, onClose, onCapture }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const metricsRef = useRef<FaceFrameMetrics | null>(null);
  const smoothRef = useRef<FaceFrameMetrics | null>(null);
  const capturingRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const { landmarkerRef, ready: landmarkerReady } = useFaceLandmarker(open);

  const captureFrame = useCallback(() => {
    if (capturingRef.current) return;
    const video = videoRef.current;
    if (!video || video.videoWidth <= 0) return;

    capturingRef.current = true;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      capturingRef.current = false;
      return;
    }

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const metrics = metricsRef.current;
    onCapture({
      dataUrl: canvas.toDataURL("image/jpeg", 0.92),
      faceShapeKey: metrics?.faceShapeKey,
      ratios: metrics?.ratios,
    });
    onClose();
  }, [onCapture, onClose]);

  useEffect(() => {
    if (!open) {
      document.documentElement.removeAttribute(FACE_CAMERA_ATTR);
      document.body.style.overflow = "";
      capturingRef.current = false;
      return;
    }
    document.documentElement.setAttribute(FACE_CAMERA_ATTR, "open");
    document.body.style.overflow = "hidden";

    setReady(false);
    setFaceDetected(false);
    setCameraError(null);
    metricsRef.current = null;
    smoothRef.current = null;
    capturingRef.current = false;

    let cancelled = false;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setReady(true);
      } catch {
        setCameraError(t("aiStylePage.cameraDenied"));
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      document.documentElement.removeAttribute(FACE_CAMERA_ATTR);
      document.body.style.overflow = "";
    };
  }, [open, t]);

  useEffect(() => {
    if (!open || !ready || capturingRef.current) return;

    const loop = () => {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (video && video.readyState >= 2 && landmarker && landmarkerReady) {
        const result = landmarker.detectForVideo(video, performance.now());
        const landmarks = result.faceLandmarks?.[0];
        if (landmarks) {
          const raw = metricsFromLandmarks(landmarks);
          const frame = raw ? smoothMetrics(smoothRef.current, raw) : null;
          smoothRef.current = frame;
          metricsRef.current = frame;
          setFaceDetected(frame !== null);
        } else {
          smoothRef.current = null;
          metricsRef.current = null;
          setFaceDetected(false);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [open, ready, landmarkerReady, landmarkerRef]);

  if (!open || typeof document === "undefined") return null;

  const statusText = !ready
    ? t("aiStylePage.scanLoading")
    : faceDetected
      ? t("aiStylePage.cameraReadyHint", { defaultValue: "Tayyor — rasmga oling" })
      : t("aiStylePage.scanCenter");

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black text-white">
      <div className="relative h-full w-full overflow-hidden">
        {cameraError ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-sm text-white/80">{cameraError}</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black"
            >
              {t("common.close")}
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full scale-x-[-1] object-cover"
            />

            <div className="pointer-events-none absolute inset-0 z-[1]">
              <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2">
                <div
                  className={cn(
                    "rounded-[50%] border-2 transition-colors duration-200",
                    faceDetected ? "border-white" : "border-white/35",
                  )}
                  style={{
                    width: "min(68vw, 260px)",
                    height: "min(88vw, 340px)",
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm"
              style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
              aria-label={t("common.close")}
            >
              <X className="h-4 w-4" />
            </button>

            <div
              className="absolute inset-x-0 z-20 flex flex-col items-center gap-4 px-6 text-center"
              style={{ bottom: "max(2rem, env(safe-area-inset-bottom))" }}
            >
              {!ready ? <Loader2 className="h-5 w-5 animate-spin text-white/70" /> : null}
              <p className="text-sm font-medium text-white/90">{statusText}</p>
              <button
                type="button"
                disabled={!ready}
                onClick={captureFrame}
                className="grid size-[72px] place-items-center rounded-full border-[3px] border-white bg-white/15 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.55)] transition active:scale-95 disabled:opacity-40"
                aria-label={t("aiStylePage.capturePhoto")}
              >
                <span className="grid size-[58px] place-items-center rounded-full bg-white text-black">
                  <Camera className="h-6 w-6" strokeWidth={2.25} />
                </span>
              </button>
              <p className="text-[11px] font-semibold text-white/65">{t("aiStylePage.capturePhoto")}</p>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
