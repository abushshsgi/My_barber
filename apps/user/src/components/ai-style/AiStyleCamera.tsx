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

/** Prefer wide selfie FOV — avoid high-res ideals that force digital zoom on some phones. */
async function openSelfieStream(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    { audio: false, video: { facingMode: { ideal: "user" } } },
    { audio: false, video: { facingMode: "user" } },
    { audio: false, video: true },
  ];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const caps = track.getCapabilities?.() as
            | (MediaTrackCapabilities & { zoom?: { min: number; max: number } })
            | undefined;
          if (caps?.zoom && typeof caps.zoom.min === "number") {
            await track.applyConstraints({
              advanced: [{ zoom: caps.zoom.min } as MediaTrackConstraintSet],
            });
          }
        } catch {
          /* zoom not supported — keep stream */
        }
      }
      return stream;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Camera unavailable");
}

export function AiStyleCamera({ open, onClose, onCapture }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const metricsRef = useRef<FaceFrameMetrics | null>(null);
  const smoothRef = useRef<FaceFrameMetrics | null>(null);
  const capturingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [ready, setReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const { landmarkerRef, ready: landmarkerReady } = useFaceLandmarker(open);

  const handleClose = useCallback((event?: React.SyntheticEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    capturingRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    onCloseRef.current();
  }, []);

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
    handleClose();
  }, [onCapture, handleClose]);

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
        const stream = await openSelfieStream();
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute("playsinline", "true");
          video.setAttribute("webkit-playsinline", "true");
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
    <div
      className="fixed inset-0 z-[300] bg-black text-white"
      role="dialog"
      aria-modal="true"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="relative h-full w-full overflow-hidden">
        {cameraError ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-sm text-white/80">{cameraError}</p>
            <button
              type="button"
              onClick={handleClose}
              onPointerDown={(event) => event.stopPropagation()}
              className="pointer-events-auto rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black"
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
              className="h-full w-full scale-x-[-1] object-cover object-center"
            />

            <div className="pointer-events-none absolute inset-0 z-[1]">
              <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2">
                <div
                  className={cn(
                    "rounded-[48%] border-2 transition-colors duration-200",
                    faceDetected ? "border-white" : "border-white/35",
                  )}
                  style={{
                    width: "min(72vw, 280px)",
                    height: "min(92vw, 360px)",
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              onPointerDown={(event) => {
                event.stopPropagation();
                handleClose(event);
              }}
              className="pointer-events-auto absolute right-4 z-30 grid h-12 w-12 place-items-center rounded-full bg-black/55 text-white shadow-lg ring-1 ring-white/25 backdrop-blur-md active:scale-95"
              style={{ top: "max(0.85rem, env(safe-area-inset-top))" }}
              aria-label={t("common.close")}
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
            </button>

            <div
              className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-3 px-6 text-center"
              style={{ bottom: "max(2rem, env(safe-area-inset-bottom))" }}
            >
              {!ready ? <Loader2 className="h-5 w-5 animate-spin text-white/70" /> : null}
              <p className="text-sm font-medium text-white/90">{statusText}</p>
              <button
                type="button"
                disabled={!ready}
                onClick={captureFrame}
                onPointerDown={(event) => event.stopPropagation()}
                className="pointer-events-auto grid size-[76px] place-items-center rounded-full border-[3px] border-white bg-white/15 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.55)] transition active:scale-95 disabled:opacity-40"
                aria-label={t("aiStylePage.capturePhoto")}
              >
                <span className="grid size-[60px] place-items-center rounded-full bg-white text-black">
                  <Camera className="h-6 w-6" strokeWidth={2.25} />
                </span>
              </button>
              <p className="pointer-events-none text-[11px] font-semibold text-white/65">
                {t("aiStylePage.capturePhoto")}
              </p>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
