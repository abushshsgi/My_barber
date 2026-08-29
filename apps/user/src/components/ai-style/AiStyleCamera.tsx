import { Camera, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  evaluateFaceQuality,
  isFaceReadyForCapture,
  metricsFromLandmarks,
  mirrorX,
  smoothMetrics,
  type FaceFrameMetrics,
  type FaceQuality,
} from "@/components/ai-style/face-scan-utils";
import { useFaceLandmarker } from "@/components/ai-style/useFaceLandmarker";
import type { FaceShapeKey } from "@/components/ai-style/ai-style-shared";
import { ensureCameraPermission } from "@/lib/native-camera";
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

function ContourOverlay({ metrics }: { metrics: FaceFrameMetrics | null }) {
  if (!metrics?.contour.length) return null;
  const points = metrics.contour
    .map((p) => {
      const m = mirrorX(p);
      return `${(m.x * 100).toFixed(2)}% ${(m.y * 100).toFixed(2)}%`;
    })
    .join(", ");
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[2]"
      aria-hidden
      style={{
        clipPath: `polygon(${points})`,
        boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.85)",
        background: "rgba(255,255,255,0.06)",
      }}
    />
  );
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
  const [quality, setQuality] = useState<FaceQuality>(() => evaluateFaceQuality(null));
  const [cameraError, setCameraError] = useState<string | null>(null);

  const { landmarkerRef, ready: landmarkerReady, error: landmarkerError } = useFaceLandmarker(open);

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
    // MediaPipe ishlayotganda sifat past bo‘lsa to‘xtatamiz; model yuklanmasa ruxsat.
    if (!landmarkerError && landmarkerReady && !isFaceReadyForCapture(metricsRef.current)) {
      return;
    }

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
  }, [onCapture, handleClose, landmarkerError, landmarkerReady]);

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
    setQuality(evaluateFaceQuality(null));
    setCameraError(null);
    metricsRef.current = null;
    smoothRef.current = null;
    capturingRef.current = false;

    let cancelled = false;
    const start = async () => {
      try {
        const allowed = await ensureCameraPermission();
        if (!allowed) {
          if (!cancelled) {
            setCameraError(
              t("aiStylePage.cameraPermissionDenied", {
                defaultValue: "Kameraga ruxsat berilmadi. Sozlamalardan yoqing.",
              }),
            );
          }
          return;
        }
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
          setQuality(evaluateFaceQuality(frame));
        } else {
          smoothRef.current = null;
          metricsRef.current = null;
          setFaceDetected(false);
          setQuality(evaluateFaceQuality(null));
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

  const canShoot = ready && isFaceReadyForCapture(metricsRef.current);
  const statusText = !ready
    ? t("aiStylePage.scanLoading")
    : landmarkerError
      ? t("aiStylePage.scanLoadFailed", {
          defaultValue: "Yuz skaneri yuklanmadi — baribir rasmga olishingiz mumkin",
        })
      : quality.reason === "no_face"
        ? t("aiStylePage.scanCenter")
        : quality.reason === "too_far"
          ? t("aiStylePage.scanTooFar", { defaultValue: "Yuzni yaqinroq tuting" })
          : quality.reason === "too_close"
            ? t("aiStylePage.scanTooClose", { defaultValue: "Biroz uzoqlashing" })
            : quality.reason === "turn_face"
              ? t("aiStylePage.scanTurnFace", { defaultValue: "Yuzni to‘g‘ri kameraga qarang" })
              : quality.reason === "off_center"
                ? t("aiStylePage.scanOffCenter", {
                    defaultValue: "Yuzni oval ichiga joylashtiring",
                  })
                : t("aiStylePage.cameraReadyHint", { defaultValue: "Tayyor — rasmga oling" });

  return createPortal(
    <div
      className="morph-ai-type fixed inset-0 z-[300] bg-black text-white"
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
                    quality.level === "good"
                      ? "border-emerald-300"
                      : faceDetected
                        ? "border-white"
                        : "border-white/35",
                  )}
                  style={{
                    width: "min(72vw, 280px)",
                    height: "min(92vw, 360px)",
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                  }}
                />
              </div>
            </div>

            <ContourOverlay metrics={smoothRef.current} />

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
              {!ready || !landmarkerReady ? (
                <Loader2 className="h-5 w-5 animate-spin text-white/70" />
              ) : null}
              <p className="text-sm font-medium text-white/90">{statusText}</p>
              <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/20">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-200",
                    quality.level === "good"
                      ? "bg-emerald-400"
                      : quality.level === "ok"
                        ? "bg-amber-300"
                        : "bg-[#F0F0F0]0",
                  )}
                  style={{ width: `${Math.round(quality.score * 100)}%` }}
                />
              </div>
              <button
                type="button"
                disabled={!ready || (!canShoot && !landmarkerError)}
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
