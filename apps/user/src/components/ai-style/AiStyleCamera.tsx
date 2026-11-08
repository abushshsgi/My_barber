import { Camera, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { FaceShapeKey } from "@/components/ai-style/ai-style-shared";
import { ensureCameraPermission } from "@/lib/native-camera";

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

async function openSelfieStream(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    { audio: false, video: { facingMode: { ideal: "user" } } },
    { audio: false, video: { facingMode: "user" } },
    { audio: false, video: true },
  ];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
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
  const capturingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const onCaptureRef = useRef(onCapture);
  onCloseRef.current = onClose;
  onCaptureRef.current = onCapture;

  const [ready, setReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

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

    onCaptureRef.current({
      dataUrl: canvas.toDataURL("image/jpeg", 0.92),
    });
    handleClose();
  }, [handleClose]);

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
    setCameraError(null);
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
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setCameraError(t("aiStylePage.cameraDenied"));
      }
    };

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      document.documentElement.removeAttribute(FACE_CAMERA_ATTR);
      document.body.style.overflow = "";
    };
  }, [open, t]);

  useEffect(() => {
    if (!open || !ready) return;
    let cancelled = false;
    let attempts = 0;
    const tick = () => {
      if (cancelled || capturingRef.current) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        captureFrame();
        return;
      }
      attempts += 1;
      if (attempts < 45) {
        requestAnimationFrame(tick);
      }
    };
    const timer = window.setTimeout(tick, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, ready, captureFrame]);

  if (!open || typeof document === "undefined") return null;

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
              <p className="text-sm font-medium text-white/90">
                {ready ? t("aiStylePage.capturePhoto") : t("aiStylePage.scanLoading")}
              </p>
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
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
