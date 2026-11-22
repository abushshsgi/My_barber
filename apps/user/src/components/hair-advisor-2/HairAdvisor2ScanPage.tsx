import { useRouter } from "@tanstack/react-router";
import { ChevronLeft, History, ImageIcon, Loader2, ScanBarcode, Shapes, Zap, ZapOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { HairAdvisorBarcodeCamera } from "@/components/ai-style/HairAdvisorBarcodeCamera";
import { HairAdvisor2NotFoundPanel } from "@/components/hair-advisor-2/HairAdvisor2NotFoundPanel";
import { HairAdvisorScannerOverlay } from "@/components/hair-advisor-2/HairAdvisorScannerOverlay";
import { diagnoseCameraAccess } from "@/lib/barcode-camera";
import { captureVideoFrameJpeg } from "@/lib/capture-video-frame";
import { removeMorphLcpStatic } from "@/lib/morph-lcp-static";
import { fetchHairScanHistory, type HairScan } from "@/lib/api/hair-advisor";
import { useHairAdvisorScanner } from "@/hooks/use-hair-advisor-scanner";
import { navigateBack } from "@/lib/mobile-back";
import { cn } from "@/lib/utils";

type Props = {
  resultPath: (scanId: string) => string;
};

export function HairAdvisor2ScanPage({ resultPath }: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraBlocked, setCameraBlocked] = useState(() => diagnoseCameraAccess() !== "ok");
  const [torch, setTorch] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HairScan[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const scanner = useHairAdvisorScanner(resultPath);
  const {
    phase,
    mode,
    setMode,
    error,
    notFoundScan,
    cameraOn,
    setCameraOn,
    processBarcode,
    submitManualBarcode,
    captureProductImage,
    processGalleryFile,
    resetScanner,
    statusText,
    lockRef,
  } = scanner;

  const lookingUp = phase === "looking_up" || phase === "analyzing";

  useEffect(() => {
    removeMorphLcpStatic();
    const ok = diagnoseCameraAccess() === "ok";
    setCameraOn(ok);
    setCameraBlocked(!ok);
    resetScanner();
    return () => {
      lockRef.current = false;
      setCameraOn(false);
    };
  }, [lockRef, resetScanner, setCameraOn]);

  const goResult = useCallback(
    (scanId: string) => {
      void router.navigate({ to: resultPath(scanId) as never });
    },
    [resultPath, router],
  );

  const onShutter = useCallback(async () => {
    if (lookingUp) return;
    if (mode === "product_image") {
      const video = videoRef.current;
      if (!video) return;
      const frame = await captureVideoFrameJpeg(video);
      if (!frame) {
        toast.error("Kadr olinmadi");
        return;
      }
      await captureProductImage(frame);
      return;
    }
    resetScanner();
  }, [captureProductImage, lookingUp, mode, resetScanner]);

  const openHistory = async () => {
    try {
      const rows = await fetchHairScanHistory();
      setHistory(rows);
      setHistoryOpen(true);
    } catch {
      toast.error("Tarix yuklanmadi");
    }
  };

  const overlayVisible =
    !notFoundScan && phase !== "not_found" && cameraOn && !cameraBlocked && !lookingUp && phase !== "error";

  return (
    <div className="relative isolate h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[#080808] text-white">
      <div className="absolute inset-0">
        {cameraBlocked && !cameraOn ? (
          <PermissionBlock
            onEnable={() => {
              setCameraBlocked(false);
              setCameraOn(true);
              resetScanner();
            }}
          />
        ) : (
          <HairAdvisorBarcodeCamera
            active={cameraOn && !lookingUp && phase !== "barcode_detected"}
            embedded
            fullScreen
            torch={torch}
            stableReadCount={3}
            enableDecode={mode === "barcode"}
            onVideoElement={(v) => {
              videoRef.current = v;
            }}
            onDetected={(code) => void processBarcode(code)}
            onClose={() => {
              setCameraOn(false);
              setCameraBlocked(true);
            }}
          />
        )}
        <HairAdvisorScannerOverlay phase={phase} statusText={statusText} mode={mode} visible={overlayVisible} />
        {lookingUp ? (
          <div className="absolute inset-0 z-[3] flex flex-col items-center justify-center gap-2 bg-black/50" role="status">
            <Loader2 className="size-9 animate-spin text-[#8B5CF6]" aria-hidden />
            <span className="text-sm font-semibold text-white">{statusText}</span>
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/85 via-black/50 to-transparent pb-8 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between px-4">
          <IconBtn label="Orqaga" onClick={() => navigateBack(router, "/ai-style/care")}>
            <ChevronLeft className="size-6" />
          </IconBtn>
          <h1 className="text-[17px] font-semibold tracking-tight">AI skaner</h1>
          <IconBtn label="Tarix" onClick={() => void openHistory()}>
            <History className="size-5" />
          </IconBtn>
        </header>
        <div className="mt-2 flex justify-center gap-2 px-4">
          <ModeChip active={mode === "barcode"} onClick={() => setMode("barcode")} icon={ScanBarcode} label="Shtrix-kod" />
          <ModeChip active={mode === "product_image"} onClick={() => setMode("product_image")} icon={Shapes} label="Rasm" />
        </div>
        {error ? (
          <p className="mt-3 px-5 text-center text-sm font-medium text-[#FCA5A5]" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/55 to-transparent pt-16">
        <footer className="pointer-events-auto flex items-center justify-center gap-10 px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-3">
          <label className="inline-flex size-12 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm">
            <ImageIcon className="size-5" />
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void processGalleryFile(f);
              }}
            />
          </label>
          <button
            type="button"
            aria-label={mode === "product_image" ? "Suratga olish" : "Skanerni tiklash"}
            disabled={lookingUp}
            onClick={() => void onShutter()}
            className="inline-flex size-[58px] items-center justify-center rounded-full bg-white text-[#080808] shadow-lg ring-4 ring-[#8B5CF6]/40 disabled:opacity-60"
          >
            <span className="size-4 rounded-full border-2 border-[#080808]" />
          </button>
          <button
            type="button"
            aria-label="Chiroq"
            onClick={() => setTorch((v) => !v)}
            className={cn(
              "inline-flex size-12 items-center justify-center rounded-full backdrop-blur-sm",
              torch ? "bg-white text-[#080808]" : "bg-white/15 text-white",
            )}
          >
            {torch ? <Zap className="size-5" /> : <ZapOff className="size-5" />}
          </button>
        </footer>
      </div>

      {notFoundScan || phase === "not_found" ? (
        <HairAdvisor2NotFoundPanel
          message={notFoundScan?.message_uz}
          onRescan={resetScanner}
          onImageSearch={() => {
            setMode("product_image");
            resetScanner();
          }}
          onManualCode={() => {
            setManualOpen(true);
          }}
        />
      ) : null}

      {manualOpen ? (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal>
          <div className="w-full max-w-md rounded-[20px] bg-white p-5 text-[#111]">
            <h3 className="text-lg font-bold">Kodni qo‘lda kiritish</h3>
            <input
              inputMode="numeric"
              className="mt-3 w-full rounded-xl border border-[#E4E4E7] px-3 py-3 text-lg tracking-wide"
              placeholder="EAN / UPC"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <button
              type="button"
              className="mt-3 w-full rounded-2xl bg-[#111] py-3 font-semibold text-white"
              onClick={() => {
                setManualOpen(false);
                void submitManualBarcode(manualCode);
                setManualCode("");
              }}
            >
              Qidirish
            </button>
            <button type="button" className="mt-2 w-full py-2 text-sm text-[#71717A]" onClick={() => setManualOpen(false)}>
              Bekor
            </button>
          </div>
        </div>
      ) : null}

      {historyOpen ? <HistoryModal history={history} onClose={() => setHistoryOpen(false)} onPick={goResult} /> : null}
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
    >
      {children}
    </button>
  );
}

function ModeChip({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof ScanBarcode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm",
        active ? "bg-[#8B5CF6] text-white" : "bg-white/15 text-white/90",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function PermissionBlock({ onEnable }: { onEnable: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#0a0a0a] px-8 text-center">
      <p className="text-[17px] font-semibold">Kamera kerak</p>
      <p className="max-w-sm text-[15px] text-[#A3A3A3]">Ruxsat bering yoki galereyadan rasm yuklang.</p>
      <button type="button" onClick={onEnable} className="mt-2 rounded-2xl bg-[#8B5CF6] px-5 py-3 text-sm font-bold text-white">
        Kamerani yoqish
      </button>
    </div>
  );
}

function HistoryModal({
  history,
  onClose,
  onPick,
}: {
  history: HairScan[];
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" role="dialog" aria-modal>
      <div className="max-h-[70vh] w-full max-w-md overflow-y-auto rounded-t-[20px] bg-white p-5 text-[#111] sm:rounded-[20px]">
        <h3 className="text-lg font-bold">Skanlar tarixi</h3>
        <ul className="mt-3 space-y-2">
          {history.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="w-full rounded-xl bg-[#F7F7F8] px-3 py-2 text-left text-sm"
                onClick={() => {
                  onClose();
                  onPick(h.id);
                }}
              >
                {h.barcode || h.care_product?.name || h.id.slice(0, 8)}
                <span className="ml-2 text-xs text-[#71717A]">{h.status}</span>
              </button>
            </li>
          ))}
          {history.length === 0 ? <li className="text-sm text-[#71717A]">Tarix bo&apos;sh</li> : null}
        </ul>
        <button type="button" className="mt-4 w-full rounded-xl border py-2 text-sm font-semibold" onClick={onClose}>
          Yopish
        </button>
      </div>
    </div>
  );
}