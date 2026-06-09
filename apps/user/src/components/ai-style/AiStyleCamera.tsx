import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Loader2,
  ScanFace,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  metricsFromLandmarks,
  mirrorX,
  nextPhase,
  phaseSatisfied,
  SCAN_SEQUENCE,
  smoothMetrics,
  type FaceFrameMetrics,
  type ScanPhase,
} from "@/components/ai-style/face-scan-utils";
import { useFaceLandmarker } from "@/components/ai-style/useFaceLandmarker";
import type { FaceShapeKey } from "@/components/ai-style/ai-style-shared";

const PHASE_HOLD_MS = 1100;
const COUNTDOWN_START = 3;
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

function drawFaceContour(
  ctx: CanvasRenderingContext2D,
  frame: FaceFrameMetrics,
  width: number,
  height: number,
  locked: boolean,
) {
  const points = frame.contour.map(mirrorX);
  if (points.length < 8) return;

  ctx.save();
  ctx.strokeStyle = locked ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.65)";
  ctx.lineWidth = locked ? 3 : 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.setLineDash(locked ? [] : [8, 6]);
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = p.x * width;
    const y = p.y * height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function AiStyleCamera({ open, onClose, onCapture }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseSinceRef = useRef(0);
  const stableMetricsRef = useRef<FaceFrameMetrics | null>(null);
  const smoothRef = useRef<FaceFrameMetrics | null>(null);
  const scanLineRef = useRef(0);

  const [phase, setPhase] = useState<ScanPhase>("loading");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<FaceFrameMetrics | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const { landmarkerRef, ready: landmarkerReady } = useFaceLandmarker(open);

  const drawOverlay = useCallback((frame: FaceFrameMetrics | null, currentPhase: ScanPhase) => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const w = video.clientWidth;
    const h = video.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    if (!frame) return;

    const locked = phaseSatisfied(currentPhase, frame) || currentPhase === "countdown";
    drawFaceContour(ctx, frame, w, h, locked);

    if (locked && frame.contour.length > 0) {
      const mirrored = frame.contour.map(mirrorX);
      const minY = Math.min(...mirrored.map((p) => p.y));
      const maxY = Math.max(...mirrored.map((p) => p.y));
      const y = minY * h + (maxY - minY) * h * scanLineRef.current;

      const boxLeft = (1 - frame.box.x - frame.box.width) * w;
      const boxRight = (1 - frame.box.x) * w;
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(boxLeft, y);
      ctx.lineTo(boxRight, y);
      ctx.stroke();
    }
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const finalMetrics = stableMetricsRef.current;
    if (!video || video.videoWidth <= 0 || !finalMetrics) return;

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
      return;
    }
    document.documentElement.setAttribute(FACE_CAMERA_ATTR, "open");
    document.body.style.overflow = "hidden";

    setPhase("loading");
    setCountdown(null);
    setMetrics(null);
    setCameraError(null);
    phaseSinceRef.current = 0;
    stableMetricsRef.current = null;
    smoothRef.current = null;

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
    if (phase !== "countdown") return;
    setCountdown(COUNTDOWN_START);
  }, [phase]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setPhase("capture");
      captureFrame();
      return;
    }
    const id = window.setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => window.clearTimeout(id);
  }, [countdown, captureFrame]);

  useEffect(() => {
    if (!open || phase === "loading" || phase === "capture") return;

    const loop = () => {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (video && video.readyState >= 2) {
        if (phase === "countdown") {
          drawOverlay(stableMetricsRef.current, "center");
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
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
        setMetrics(frame);
        drawOverlay(frame, phase);

        if (frame) {
          if (phase === "searching") {
            setPhase("turn_left");
            phaseSinceRef.current = 0;
          }

          const satisfied = phaseSatisfied(phase, frame);
          const now = performance.now();
          if (satisfied) {
            if (!phaseSinceRef.current) phaseSinceRef.current = now;
            stableMetricsRef.current = frame;
            if (now - phaseSinceRef.current >= PHASE_HOLD_MS) {
              const upcoming = nextPhase(phase);
              if (upcoming === "countdown") {
                setPhase("countdown");
                phaseSinceRef.current = 0;
              } else {
                setPhase(upcoming);
                phaseSinceRef.current = 0;
              }
            }
          } else {
            phaseSinceRef.current = 0;
          }
        } else if (phase === "searching") {
          phaseSinceRef.current = 0;
        } else {
          phaseSinceRef.current = 0;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [open, phase, landmarkerReady, landmarkerRef, drawOverlay]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      scanLineRef.current = scanLineRef.current >= 1 ? 0 : scanLineRef.current + 0.05;
    }, 60);
    return () => window.clearInterval(id);
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const phaseLabel = {
    loading: t("aiStylePage.scanLoading"),
    searching: t("aiStylePage.scanSearching"),
    turn_left: t("aiStylePage.scanLeft"),
    turn_right: t("aiStylePage.scanRight"),
    turn_up: t("aiStylePage.scanUp"),
    turn_down: t("aiStylePage.scanDown"),
    center: t("aiStylePage.scanCenter"),
    countdown: t("aiStylePage.scanCountdown"),
    capture: t("aiStylePage.scanCapture"),
  }[phase];

  const progressIndex =
    phase === "countdown" || phase === "capture"
      ? SCAN_SEQUENCE.length
      : SCAN_SEQUENCE.indexOf(phase as (typeof SCAN_SEQUENCE)[number]);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-black text-white">
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-2">
          <ScanFace className="h-4 w-4" />
          <p className="text-sm font-bold">{t("aiStylePage.cameraTitle")}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/15"
          aria-label={t("common.close")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {cameraError ? (
          <p className="flex h-full items-center justify-center px-6 text-center text-sm text-white/80">
            {cameraError}
          </p>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full scale-x-[-1] object-cover"
            />
            <canvas
              ref={overlayRef}
              className="pointer-events-none absolute inset-0 h-full w-full"
            />

            {phase === "turn_left" ? (
              <motion.div
                animate={{ x: [-8, 8, -8] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="pointer-events-none absolute left-6 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-3"
              >
                <ArrowLeft className="h-6 w-6" />
              </motion.div>
            ) : null}
            {phase === "turn_right" ? (
              <motion.div
                animate={{ x: [8, -8, 8] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="pointer-events-none absolute right-6 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-3"
              >
                <ArrowRight className="h-6 w-6" />
              </motion.div>
            ) : null}
            {phase === "turn_up" ? (
              <motion.div
                animate={{ y: [-8, 8, -8] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="pointer-events-none absolute left-1/2 top-8 z-10 -translate-x-1/2 rounded-full bg-white/20 p-3"
              >
                <ArrowUp className="h-6 w-6" />
              </motion.div>
            ) : null}
            {phase === "turn_down" ? (
              <motion.div
                animate={{ y: [8, -8, 8] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="pointer-events-none absolute bottom-28 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/20 p-3"
              >
                <ArrowDown className="h-6 w-6" />
              </motion.div>
            ) : null}

            {metrics && phase !== "loading" && phase !== "countdown" ? (
              <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide">
                {t(`aiStylePage.faceShapes.${metrics.faceShapeKey}`)}
              </div>
            ) : null}

            <AnimatePresence>
              {countdown !== null && countdown > 0 ? (
                <motion.div
                  key={countdown}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.4, opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-black/25"
                >
                  <span className="text-8xl font-black tabular-nums text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
                    {countdown}
                  </span>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-6 pt-16 pb-[max(1.75rem,env(safe-area-inset-bottom))]"
            >
              <div className="flex justify-center gap-1.5">
                {SCAN_SEQUENCE.map((step, i) => (
                  <div
                    key={step}
                    className={`h-1.5 w-8 rounded-full transition-colors ${
                      progressIndex > i ? "bg-white" : progressIndex === i ? "bg-white/60" : "bg-white/25"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-4 text-center text-sm font-bold drop-shadow-md">{phaseLabel}</p>
              {phase === "loading" || !landmarkerReady ? (
                <div className="mt-3 flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-white/70" />
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
