import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  applyVideoTorch,
  cameraAccessUserMessage,
  diagnoseCameraAccess,
  openBarcodeVideoStream,
  supportsBarcodeDetector,
} from "@/lib/barcode-camera";
import { currentLang } from "@/i18n/config";
import { normalizeBarcode } from "@/lib/hair-advisor-barcode-normalize";
import { retailBarcodeHints } from "@/lib/hair-advisor-barcode-decode";
import { cn } from "@/lib/utils";

type Props = {
  active: boolean;
  onDetected: (barcode: string) => void;
  onClose: () => void;
  onDecodeFailed?: () => void;
  className?: string;
  embedded?: boolean;
  /** Kamera butun konteyner/orqa fonni qoplaydi (skaner sahifasi). */
  fullScreen?: boolean;
  torch?: boolean;
  /** Barcode bir xil ketma-ket o‘qilgan kadrlar soni. */
  stableReadCount?: number;
  /** false = faqat kamera ko‘rinishi (rasm rejimi). */
  enableDecode?: boolean;
  onVideoElement?: (video: HTMLVideoElement | null) => void;
  onCameraLifecycle?: (state: "requesting" | "ready" | "denied" | "unavailable") => void;
};

const NATIVE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] as const;

function mapGetUserMediaError(
  err: unknown,
): "hairAdvisor.cameraDenied" | "hairAdvisor.cameraBusy" | "hairAdvisor.cameraNotFound" {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "hairAdvisor.cameraNotFound";
  if (name === "NotReadableError" || name === "TrackStartError") return "hairAdvisor.cameraBusy";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError")
    return "hairAdvisor.cameraDenied";
  if (name === "OverconstrainedError") return "hairAdvisor.cameraNotFound";
  return "hairAdvisor.cameraDenied";
}

export function HairAdvisorBarcodeCamera({
  active,
  onDetected,
  onClose,
  onDecodeFailed,
  className,
  embedded,
  fullScreen = false,
  torch = false,
  stableReadCount = 2,
  enableDecode = true,
  onVideoElement,
  onCameraLifecycle,
}: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lockedRef = useRef(false);
  const lastNormalizedRef = useRef<string | null>(null);
  const stableHitsRef = useRef(0);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    onVideoElement?.(videoRef.current);
    return () => onVideoElement?.(null);
  }, [onVideoElement, active, starting]);

  useEffect(() => {
    if (!active) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      lockedRef.current = false;
      lastNormalizedRef.current = null;
      stableHitsRef.current = 0;
      return;
    }

    const access = diagnoseCameraAccess();
    if (access !== "ok") {
      const lang = currentLang();
      toast.error(
        t("hairAdvisor.cameraDenied", {
          defaultValue: cameraAccessUserMessage(access, lang),
        }),
      );
      onClose();
      return;
    }

    let stopped = false;
    let raf = 0;
    let zxingControls: { stop: () => void } | null = null;
    let zxingReader: { reset: () => void } | null = null;

    const emitCode = (raw: string) => {
      const parsed = normalizeBarcode(raw);
      const normalized = parsed.normalizedValue;
      if (!normalized || normalized.length < 8 || lockedRef.current) return;
      if (lastNormalizedRef.current === normalized) {
        stableHitsRef.current += 1;
      } else {
        lastNormalizedRef.current = normalized;
        stableHitsRef.current = 1;
      }
      if (stableHitsRef.current < Math.max(1, stableReadCount)) return;
      lockedRef.current = true;
      stopped = true;
      onDetected(normalized);
      if (!embedded) onClose();
    };

    const startNativeLoop = (detector: { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> }) => {
      const tick = async () => {
        if (stopped || !videoRef.current || videoRef.current.readyState < 2) {
          raf = requestAnimationFrame(() => void tick());
          return;
        }
        try {
          const codes = await detector.detect(videoRef.current);
          for (const code of codes) {
            if (code.rawValue) emitCode(code.rawValue);
          }
        } catch {
          /* frame */
        }
        if (!stopped) raf = requestAnimationFrame(() => void tick());
      };
      raf = requestAnimationFrame(() => void tick());
    };

    const startZxingLoop = async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader(await retailBarcodeHints());
        zxingReader = reader;
        const video = videoRef.current;
        if (!video || stopped) {
          reader.reset();
          return;
        }

        const deviceId = streamRef.current?.getVideoTracks()[0]?.getSettings().deviceId;

        const controls = await reader.decodeFromVideoDevice(
          deviceId ?? null,
          video,
          (result, err) => {
            if (stopped) return;
            if (result) {
              emitCode(result.getText());
              return;
            }
            if (err && typeof err === "object" && "name" in err) {
              const name = (err as { name: string }).name;
              if (name !== "NotFoundException") return;
            }
          },
        );
        zxingControls = { stop: () => controls?.stop() };
      } catch {
        onDecodeFailed?.();
        toast.error(
          t("hairAdvisor.decodeFail", {
            defaultValue: "Shtrix-kodni o‘qib bo‘lmadi. Galereyadan rasm yuklang.",
          }),
        );
        onClose();
      }
    };

    const start = async () => {
      setStarting(true);
      onCameraLifecycle?.("requesting");
      try {
        const { ensureCameraPermission } = await import("@/lib/native-camera");
        const allowed = await ensureCameraPermission();
        if (!allowed) {
          onCameraLifecycle?.("denied");
          toast.error(t("hairAdvisor.cameraDenied", { defaultValue: "Kameraga ruxsat berilmadi." }));
          onClose();
          return;
        }

        const stream = await openBarcodeVideoStream();
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        onCameraLifecycle?.("ready");
        setStarting(false);

        if (!enableDecode) return;

        const NativeDetector = (
          window as unknown as {
            BarcodeDetector?: new (o?: { formats?: string[] }) => {
              detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]>;
            };
          }
        ).BarcodeDetector;

        if (NativeDetector && supportsBarcodeDetector()) {
          const detector = new NativeDetector({ formats: [...NATIVE_FORMATS] });
          startNativeLoop(detector);
        } else {
          await startZxingLoop();
        }
      } catch (err) {
        const key = mapGetUserMediaError(err);
        onCameraLifecycle?.(
          key === "hairAdvisor.cameraNotFound" || key === "hairAdvisor.cameraBusy"
            ? "unavailable"
            : "denied",
        );
        toast.error(
          t(key, {
            defaultValue:
              key === "hairAdvisor.cameraNotFound"
                ? "Kamera topilmadi."
                : key === "hairAdvisor.cameraBusy"
                  ? "Kamera boshqa ilova tomonidan ishlatilmoqda."
                  : "Kameraga ruxsat berilmadi.",
          }),
        );
        onClose();
      } finally {
        setStarting(false);
      }
    };

    void start();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      zxingControls?.stop();
      zxingReader?.reset();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      lockedRef.current = false;
    };
  }, [active, embedded, enableDecode, onClose, onDecodeFailed, onDetected, stableReadCount, t]);

  useEffect(() => {
    if (!active) return;
    void applyVideoTorch(streamRef.current, torch);
  }, [active, torch]);

  if (!active) return null;

  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-black",
        fullScreen ? "absolute inset-0 h-full w-full" : "rounded-2xl border border-[#303030]",
        !fullScreen && !embedded && "border-[#111]/15",
        className,
      )}
      role="region"
      aria-label={t("hairAdvisor.barcodeCamera", { defaultValue: "Shtrix-kod kamerasi" })}
    >
      <video
        ref={videoRef}
        className={cn("object-cover", fullScreen ? "absolute inset-0 h-full w-full" : "h-full w-full")}
        playsInline
        muted
      />
      {!fullScreen ? (
        <div className="pointer-events-none absolute inset-[10%] rounded-2xl border-2 border-white/90" aria-hidden />
      ) : null}
      {!fullScreen && !reducedMotion ? <motionLayer /> : null}
      {starting ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="size-8 animate-spin text-white" />
        </div>
      ) : null}
      {!embedded ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white"
        >
          {t("hairAdvisor.closeCamera", { defaultValue: "Yopish" })}
        </button>
      ) : null}
    </div>
  );
}

function motionLayer() {
  return (
    <>
      <style>{`@keyframes ha2-scan-line{from{top:14%}to{top:72%}}`}</style>
      <div
        className="pointer-events-none absolute left-[12%] right-[12%] h-0.5 bg-white/35"
        style={{ animation: "ha2-scan-line 2.1s ease-in-out infinite alternate" }}
        aria-hidden
      />
    </>
  );
}