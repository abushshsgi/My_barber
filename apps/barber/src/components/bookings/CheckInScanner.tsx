import { Loader2, ScanLine, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { resolveCheckInPayload } from "@mybarber/shared/booking-lifecycle";

type DetectedBarcode = { rawValue: string };

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorCtor = {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
};

const SCAN_FORMATS = ["qr_code", "code_128", "code_39", "ean_13", "data_matrix"];

function getBarcodeDetector(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector ?? null;
}

/**
 * Kamera orqali mijoz check-in QR/barcode kodini skaner qiladi.
 * `BarcodeDetector` mavjud bo'lmasa, qo'lda kiritishga qaytariladi.
 */
export function CheckInScanner({
  open,
  onClose,
  onDetected,
}: {
  open: boolean;
  onClose: () => void;
  onDetected: (raw: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;

    const Detector = getBarcodeDetector();
    if (!Detector) {
      setError("Bu qurilmada avtomatik skaner qo'llab-quvvatlanmaydi. Kodni qo'lda kiriting.");
      return;
    }

    let stream: MediaStream | null = null;
    let detector: BarcodeDetectorLike | null = null;
    let rafId = 0;
    let stopped = false;

    const tick = async () => {
      const video = videoRef.current;
      if (stopped || !video || !detector || video.readyState < 2) {
        rafId = requestAnimationFrame(() => void tick());
        return;
      }
      try {
        const codes = await detector.detect(video);
        for (const c of codes) {
          const payload = resolveCheckInPayload(c.rawValue);
          if (payload) {
            stopped = true;
            onDetected(c.rawValue);
            return;
          }
        }
      } catch {
        /* freym o'tkazib yuboriladi */
      }
      rafId = requestAnimationFrame(() => void tick());
    };

    const start = async () => {
      setStarting(true);
      setError(null);
      try {
        detector = new Detector({ formats: SCAN_FORMATS });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (stopped) return;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        rafId = requestAnimationFrame(() => void tick());
      } catch {
        setError("Kameraga ruxsat berilmadi. Kodni qo'lda kiriting.");
      } finally {
        setStarting(false);
      }
    };

    void start();

    return () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [open, onDetected]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between p-4 text-white">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <ScanLine className="size-4" />
          QR / barcode skaner
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 hover:bg-white/20"
          aria-label="Yopish"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="size-60 rounded-3xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
        </div>
        {starting ? (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <Loader2 className="size-7 animate-spin" />
          </div>
        ) : null}
      </div>

      <div className="p-5 text-center text-sm text-white/80">
        {error ? error : "Mijoz QR yoki barcode kodini ramka ichiga joylashtiring"}
      </div>
    </div>
  );
}
