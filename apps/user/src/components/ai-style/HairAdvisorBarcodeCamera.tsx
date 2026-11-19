import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  active: boolean;
  onDetected: (barcode: string) => void;
  onClose: () => void;
  className?: string;
  /** To'liq sahifa skaneri — yopish tugmasi yashirin */
  embedded?: boolean;
};

const BARCODE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] as const;

export function HairAdvisorBarcodeCamera({ active, onDetected, onClose, className, embedded }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!active) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      return;
    }

    const Detector = (
      window as unknown as {
        BarcodeDetector?: new (o?: { formats?: string[] }) => {
          detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]>;
        };
      }
    ).BarcodeDetector;

    if (!Detector) {
      toast.error(t("hairAdvisor.cameraUnsupported"));
      onClose();
      return;
    }

    let stopped = false;
    let locked = false;
    let raf = 0;
    const detector = new Detector({ formats: [...BARCODE_FORMATS] });
    setStarting(true);

    const start = async () => {
      try {
        const { ensureCameraPermission } = await import("@/lib/native-camera");
        const allowed = await ensureCameraPermission();
        if (!allowed) {
          toast.error(t("hairAdvisor.cameraDenied"));
          onClose();
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStarting(false);

        const tick = async () => {
          if (stopped || !videoRef.current || videoRef.current.readyState < 2) {
            raf = requestAnimationFrame(() => void tick());
            return;
          }
          try {
            const codes = await detector.detect(videoRef.current);
            for (const code of codes) {
              const digits = code.rawValue.replace(/\D/g, "");
              if (digits.length >= 8 && !locked) {
                locked = true;
                stopped = true;
                onDetected(digits);
                if (!embedded) onClose();
                return;
              }
            }
          } catch {
            /* skip frame */
          }
          raf = requestAnimationFrame(() => void tick());
        };
        raf = requestAnimationFrame(() => void tick());
      } catch {
        toast.error(t("hairAdvisor.cameraDenied"));
        onClose();
      } finally {
        setStarting(false);
      }
    };

    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [active, onClose, onDetected, t]);

  if (!active) return null;

  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[#303030] bg-black",
        embedded ? "" : "border-[#111]/15",
        className,
      )}
      role="region"
      aria-label={t("hairAdvisor.barcodeCamera")}
    >
      <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
      <div className="pointer-events-none absolute inset-[10%] rounded-2xl border-2 border-white/90" aria-hidden />
      {!reducedMotion ? (
        <motionLayer />
      ) : null}
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
          {t("hairAdvisor.closeCamera")}
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