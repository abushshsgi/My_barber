import { useEffect, useRef, useState } from "react";
import { Camera, X, SwitchCamera } from "lucide-react";
import { blobToFile } from "@/lib/salon-image-enhance";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
};

export function SalonCameraCapture({ open, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError(null);
    setReady(false);

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError("Bu qurilmada kamera ochilmaydi. Galereyadan rasm tanlang.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setError("Kameraga ruxsat berilmadi yoki ochilmadi.");
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, facingMode]);

  if (!open) return null;

  const snap = () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(blobToFile(blob, `salon-camera-${Date.now()}.jpg`));
        onClose();
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/90 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-background">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-sm opacity-90 hover:opacity-100"
        >
          <X className="size-4" />
          Yopish
        </button>
        <button
          type="button"
          onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
          className="inline-flex items-center gap-1.5 text-sm opacity-90 hover:opacity-100"
        >
          <SwitchCamera className="size-4" />
          Ayirish
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-6">
        <div className="relative w-full max-w-lg aspect-[3/4] sm:aspect-square overflow-hidden rounded-2xl bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className={cn("size-full object-cover", error && "opacity-0")}
          />
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-background/90">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="pb-8 flex justify-center">
        <button
          type="button"
          disabled={!ready || Boolean(error)}
          onClick={snap}
          className="size-16 rounded-full border-4 border-background bg-background/20 backdrop-blur flex items-center justify-center disabled:opacity-40"
          aria-label="Rasmga olish"
        >
          <Camera className="size-7 text-background" />
        </button>
      </div>
    </div>
  );
}
