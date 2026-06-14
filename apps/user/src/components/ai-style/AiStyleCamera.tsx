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
import { cn } from "@/lib/utils";

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

const PHASE_ICONS = {
  turn_left: ArrowLeft,
  turn_right: ArrowRight,
  turn_up: ArrowUp,
  turn_down: ArrowDown,
} as const;

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
  ctx.strokeStyle = locked ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.45)";
  ctx.lineWidth = locked ? 2.5 : 1.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.setLineDash(locked ? [] : [6, 5]);
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

function ScanDirectionIcon({ phase }: { phase: ScanPhase }) {
  const Icon = PHASE_ICONS[phase as keyof typeof PHASE_ICONS];
  if (!Icon) return <ScanFace className="h-4 w-4 shrink-0" strokeWidth={2.25} />;

  const motionProps =
    phase === "turn_left"
      ? { animate: { x: [-3, 3, -3] } }
      : phase === "turn_right"
        ? { animate: { x: [3, -3, 3] } }
        : phase === "turn_up"
          ? { animate: { y: [-3, 3, -3] } }
          : { animate: { y: [3, -3, 3] } };

  return (
    <motion.span
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15"
      {...motionProps}
      transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
    >
      <Icon className="h-4 w-4" strokeWidth={2.25} />
    </motion.span>
  );
}

function ScanProgressRing({ progress, total }: { progress: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (progress / total) * 100) : 0;
  const r = 46;
  const c = 2 * Math.PI * r;

  return (
    <svg className="absolute -inset-3 h-[calc(100%+24px)] w-[calc(100%+24px)] -rotate-90" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * pct) / 100}
        className="transition-[stroke-dashoffset] duration-500 ease-out"
      />
    </svg>
  );
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
      ctx.strokeStyle = "rgba(255,255,255,0.65)";
      ctx.lineWidth = 1.5;
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

  const stepNumber = progressIndex >= 0 ? progressIndex + 1 : 0;
  const phaseLocked = metrics !== null && phaseSatisfied(phase, metrics);
  const showGuide = !cameraError && phase !== "loading";

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black text-white">
      <div className="relative h-full w-full overflow-hidden">
        {cameraError ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <ScanFace className="h-10 w-10 text-white/50" strokeWidth={1.5} />
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
            <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />

            {showGuide ? (
              <div className="pointer-events-none absolute inset-0 z-[6]">
                <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2">
                  <div
                    className="relative rounded-[50%]"
                    style={{
                      width: "min(74vw, 290px)",
                      height: "min(96vw, 380px)",
                      boxShadow: "0 0 0 9999px rgba(0,0,0,0.52)",
                    }}
                  >
                    <ScanProgressRing progress={progressIndex} total={SCAN_SEQUENCE.length} />
                    <div
                      className={cn(
                        "absolute inset-0 rounded-[50%] border-[2.5px] transition-all duration-300",
                        phaseLocked || phase === "countdown"
                          ? "border-white shadow-[0_0_24px_rgba(255,255,255,0.35)]"
                          : "border-white/35 border-dashed",
                      )}
                    />
                    {phaseLocked ? (
                      <motion.div
                        className="absolute inset-0 rounded-[50%] border-2 border-white/50"
                        animate={{ scale: [1, 1.04, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md"
              style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
              aria-label={t("common.close")}
            >
              <X className="h-4 w-4" />
            </button>

            {!cameraError ? (
              <div
                className="absolute inset-x-4 z-20"
                style={{ top: "max(3.25rem, calc(env(safe-area-inset-top) + 2.75rem))" }}
              >
                <div className="mx-auto flex max-w-sm items-center justify-center gap-1.5 rounded-full border border-white/12 bg-black/35 px-3 py-2 backdrop-blur-xl">
                  {SCAN_SEQUENCE.map((step, i) => (
                    <span
                      key={step}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        progressIndex > i
                          ? "w-5 bg-white"
                          : progressIndex === i
                            ? "w-5 bg-white/70"
                            : "w-1.5 bg-white/25",
                      )}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {metrics && phase !== "loading" && phase !== "countdown" ? (
              <div
                className="absolute left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md"
                style={{ top: "max(5.5rem, calc(env(safe-area-inset-top) + 4.75rem))" }}
              >
                {t(`aiStylePage.faceShapes.${metrics.faceShapeKey}`)}
              </div>
            ) : null}

            {showGuide && phase !== "countdown" ? (
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute inset-x-5 z-20"
                style={{ bottom: "max(2rem, env(safe-area-inset-bottom))" }}
              >
                <div className="mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-white/12 bg-black/45 px-4 py-3.5 backdrop-blur-xl">
                  {phase === "loading" || !landmarkerReady ? (
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-white/80" />
                  ) : (
                    <ScanDirectionIcon phase={phase} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-white/55">
                      {stepNumber > 0
                        ? t("aiStylePage.scanStep", { current: stepNumber, total: SCAN_SEQUENCE.length })
                        : t("aiStylePage.cameraTitle")}
                    </p>
                    <p className="mt-0.5 text-sm font-bold leading-snug text-white">{phaseLabel}</p>
                  </div>
                </div>
              </motion.div>
            ) : null}

            <AnimatePresence>
              {countdown !== null && countdown > 0 ? (
                <motion.div
                  key={countdown}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.3, opacity: 0 }}
                  transition={{ duration: 0.32, ease: "easeOut" }}
                  className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-black/40 backdrop-blur-[2px]"
                >
                  <div className="relative grid place-items-center">
                    <motion.span
                      className="absolute h-28 w-28 rounded-full border-2 border-white/30"
                      animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                    />
                    <span className="text-[7rem] font-black leading-none tabular-nums text-white drop-shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                      {countdown}
                    </span>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
