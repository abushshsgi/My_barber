import { motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  metricsFromLandmarks,
  nextPhase,
  phaseSatisfied,
  SCAN_SEQUENCE,
  smoothMetrics,
  type FaceFrameMetrics,
  type ScanPhase,
} from "@/components/ai-style/face-scan-utils";
import { useFaceLandmarker } from "@/components/ai-style/useFaceLandmarker";
import type { FaceShapeKey } from "@/components/ai-style/ai-style-shared";
import { cn } from "@/lib/utils";

const PHASE_HOLD_MS = 500;
const FACE_CAMERA_ATTR = "data-face-camera";

export type CameraCapturePayload = {
  dataUrl: string;
  faceShapeKey: FaceShapeKey;
  ratios: { widthToHeight: number; jawToForehead: number };
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (payload: CameraCapturePayload) => void;
};

function FaceIdRing({ progress }: { progress: number }) {
  const pct = Math.min(100, Math.max(0, progress));
  const r = 46;
  const c = 2 * Math.PI * r;

  return (
    <svg className="absolute -inset-2 h-[calc(100%+16px)] w-[calc(100%+16px)] -rotate-90" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * pct) / 100}
        className="transition-[stroke-dashoffset] duration-75 ease-linear"
      />
    </svg>
  );
}

export function AiStyleCamera({ open, onClose, onCapture }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseSinceRef = useRef(0);
  const stableMetricsRef = useRef<FaceFrameMetrics | null>(null);
  const smoothRef = useRef<FaceFrameMetrics | null>(null);
  const capturingRef = useRef(false);

  const [phase, setPhase] = useState<ScanPhase>("loading");
  const [holdProgress, setHoldProgress] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const { landmarkerRef, ready: landmarkerReady } = useFaceLandmarker(open);

  const captureFrame = useCallback(() => {
    if (capturingRef.current) return;
    const video = videoRef.current;
    const finalMetrics = stableMetricsRef.current;
    if (!video || video.videoWidth <= 0 || !finalMetrics) return;

    capturingRef.current = true;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    onCapture({
      dataUrl: canvas.toDataURL("image/jpeg", 0.92),
      faceShapeKey: finalMetrics.faceShapeKey,
      ratios: finalMetrics.ratios,
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

    setPhase("loading");
    setHoldProgress(0);
    setFaceDetected(false);
    setCameraError(null);
    phaseSinceRef.current = 0;
    stableMetricsRef.current = null;
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
        setPhase("searching");
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
    if (!open || phase === "loading" || phase === "capture" || capturingRef.current) return;

    const loop = () => {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (video && video.readyState >= 2) {
        let frame: FaceFrameMetrics | null = null;
        if (landmarker && landmarkerReady) {
          const result = landmarker.detectForVideo(video, performance.now());
          const landmarks = result.faceLandmarks?.[0];
          if (landmarks) {
            const raw = metricsFromLandmarks(landmarks);
            if (raw) frame = smoothMetrics(smoothRef.current, raw);
            smoothRef.current = frame;
          } else {
            smoothRef.current = null;
          }
        }

        setFaceDetected(frame !== null);

        if (frame) {
          if (phase === "searching") {
            setPhase(SCAN_SEQUENCE[0] ?? "center");
            phaseSinceRef.current = 0;
          }

          const satisfied = phaseSatisfied(phase, frame);
          const now = performance.now();

          if (satisfied) {
            if (!phaseSinceRef.current) phaseSinceRef.current = now;
            stableMetricsRef.current = frame;
            const held = now - phaseSinceRef.current;
            const progress = Math.min(100, (held / PHASE_HOLD_MS) * 100);
            setHoldProgress(progress);

            if (held >= PHASE_HOLD_MS) {
              const upcoming = nextPhase(phase);
              if (upcoming === "capture" || upcoming === "countdown") {
                setPhase("capture");
                captureFrame();
                return;
              }
              setPhase(upcoming);
              phaseSinceRef.current = 0;
              setHoldProgress(0);
            }
          } else {
            phaseSinceRef.current = 0;
            setHoldProgress(0);
          }
        } else {
          phaseSinceRef.current = 0;
          setHoldProgress(0);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [open, phase, landmarkerReady, landmarkerRef, captureFrame]);

  if (!open || typeof document === "undefined") return null;

  const locked = holdProgress > 0;
  const ready = holdProgress >= 100;
  const statusText =
    phase === "loading" || !landmarkerReady
      ? t("aiStylePage.scanLoading")
      : !faceDetected
        ? t("aiStylePage.scanSearching")
        : locked
          ? t("aiStylePage.scanCapture")
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
                  className="relative rounded-[50%]"
                  style={{
                    width: "min(68vw, 260px)",
                    height: "min(88vw, 340px)",
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                  }}
                >
                  <FaceIdRing progress={holdProgress} />
                  <div
                    className={cn(
                      "absolute inset-0 rounded-[50%] border-2 transition-colors duration-200",
                      ready ? "border-white" : locked ? "border-white/90" : "border-white/40",
                    )}
                  />
                  {locked && !ready ? (
                    <motion.div
                      className="absolute inset-0 rounded-[50%] border border-white/60"
                      animate={{ scale: [1, 1.03, 1], opacity: [0.6, 0.2, 0.6] }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ) : null}
                </div>
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
              className="absolute inset-x-8 z-20 flex flex-col items-center gap-2 text-center"
              style={{ bottom: "max(2.5rem, env(safe-area-inset-bottom))" }}
            >
              {(phase === "loading" || !landmarkerReady) && (
                <Loader2 className="h-5 w-5 animate-spin text-white/70" />
              )}
              <p className="text-sm font-medium text-white/90">{statusText}</p>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
