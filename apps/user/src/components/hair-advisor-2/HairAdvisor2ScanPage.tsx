import { useRouter } from "@tanstack/react-router";
import { ChevronLeft, History, ImageIcon, Keyboard, Loader2, Zap, ZapOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { HairAdvisorBarcodeCamera } from "@/components/ai-style/HairAdvisorBarcodeCamera";
import { HairAdvisor2NotFoundPanel } from "@/components/hair-advisor-2/HairAdvisor2NotFoundPanel";
import { HairAdvisorScannerOverlay } from "@/components/hair-advisor-2/HairAdvisorScannerOverlay";
import { HA_SCANNER } from "@/components/hair-advisor-2/hair-advisor-scanner-theme";
import { diagnoseCameraAccess } from "@/lib/barcode-camera";
import { captureVideoFrameJpeg } from "@/lib/capture-video-frame";
import { removeMorphLcpStatic } from "@/lib/morph-lcp-static";
import { fetchHairScanHistory, type HairScan } from "@/lib/api/hair-advisor";
import { useSmartScanner } from "@/hooks/use-smart-scanner";
import {
  canShowActiveScanAnimation,
  resolveScannerUiPhase,
  statusI18nKey,
  type ScannerCameraGate,
} from "@/lib/hair-advisor-scanner-logic";
import { navigateBack } from "@/lib/mobile-back";
import { cn } from "@/lib/utils";

type Props = {
  resultPath: (scanId: string) => string;
};

export function HairAdvisor2ScanPage({ resultPath }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraBlocked, setCameraBlocked] = useState(() => diagnoseCameraAccess() !== "ok");
  const [cameraGate, setCameraGate] = useState<ScannerCameraGate>(() =>
    diagnoseCameraAccess() !== "ok" ? "permission_denied" : "idle",
  );
  const [cameraStreamReady, setCameraStreamReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HairScan[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<"load" | "unauthorized" | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const scanner = useSmartScanner(resultPath);
  const {
    phase,
    mode,
    setMode,
    error,
    notFoundScan,
    cameraOn,
    setCameraOn,
    detectedBarcode,
    processBarcode,
    submitManualBarcode,
    captureProductImage,
    processGalleryFile,
    resetScanner,
    resumeScanning,
    cancelLookup,
    lockRef,
  } = scanner;

  const displayPhase = resolveScannerUiPhase(phase, cameraGate);
  const statusKey = statusI18nKey(displayPhase, mode);
  const statusText = statusKey ? t(statusKey) : "";
  const lookingUp = phase === "looking_up" || phase === "analyzing";
  const sessionLocked = lookingUp || phase === "barcode_detected" || Boolean(lockRef.current);

  useEffect(() => {
    if (cameraGate === "ready" && cameraStreamReady && phase === "idle" && !sessionLocked) {
      resumeScanning();
    }
  }, [cameraGate, cameraStreamReady, phase, resumeScanning, sessionLocked]);

  useEffect(() => {
    removeMorphLcpStatic();
    const ok = diagnoseCameraAccess() === "ok";
    setCameraOn(ok);
    setCameraBlocked(!ok);
    setCameraGate(ok ? "idle" : "permission_denied");
    setCameraStreamReady(false);
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

  const onCaptureImage = useCallback(async () => {
    if (lookingUp || mode !== "product_image") return;
    const video = videoRef.current;
    if (!video) return;
    const frame = await captureVideoFrameJpeg(video);
    if (!frame) {
      toast.error(t("scanner.errors.imageFailed"));
      return;
    }
    await captureProductImage(frame);
  }, [captureProductImage, lookingUp, mode, t]);

  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const rows = await fetchHairScanHistory();
      setHistory(rows);
    } catch (e) {
      const message = e instanceof Error ? e.message.toLowerCase() : "";
      if (message.includes("401") || message.includes("unauthorized") || message.includes("kirish")) {
        setHistoryError("unauthorized");
      } else {
        setHistoryError("load");
      }
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const overlayVisible =
    !notFoundScan &&
    phase !== "not_found" &&
    phase !== "error" &&
    !lookingUp &&
    canShowActiveScanAnimation({
      cameraGate,
      cameraStreamReady,
      mode,
      workflowPhase: phase,
      decodeEnabled: mode === "barcode",
      sessionLocked,
    });

  return (
    <div
      className="relative isolate mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-6xl overflow-hidden text-white md:gap-6 md:px-6 md:py-4"
      style={{ backgroundColor: HA_SCANNER.bg }}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden md:rounded-3xl md:ring-1 md:ring-white/10">
        <div className="absolute inset-0">
          {cameraBlocked && !cameraOn ? (
            <PermissionBlock
              onEnable={() => {
                setCameraBlocked(false);
                setCameraOn(true);
                setCameraGate("requesting_permission");
                setCameraStreamReady(false);
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
                setCameraStreamReady(false);
                if (cameraGate !== "unavailable") setCameraGate("permission_denied");
              }}
              onCameraLifecycle={(state) => {
                if (state === "ready") {
                  setCameraGate("ready");
                  setCameraStreamReady(true);
                  setCameraBlocked(false);
                } else if (state === "requesting") {
                  setCameraGate("initializing");
                  setCameraStreamReady(false);
                } else if (state === "denied") {
                  setCameraGate("permission_denied");
                  setCameraStreamReady(false);
                  setCameraBlocked(true);
                  setCameraOn(false);
                } else {
                  setCameraGate("camera_unavailable");
                  setCameraStreamReady(false);
                  setCameraBlocked(true);
                  setCameraOn(false);
                }
              }}
            />
          )}
          <HairAdvisorScannerOverlay
            phase={displayPhase}
            statusText={statusText}
            mode={mode}
            visible={overlayVisible}
          />
          {lookingUp ? (
            <div className="absolute inset-0 z-[3] flex flex-col items-center justify-center gap-3 bg-black/55" role="status">
              <Loader2 className="size-9 animate-spin text-white" aria-hidden />
              <span className="text-sm font-semibold text-white">{statusText}</span>
              {detectedBarcode ? (
                <span className="font-mono text-xs text-white/70">{detectedBarcode}</span>
              ) : null}
              <button
                type="button"
                className="mt-2 rounded-full border border-white/30 px-4 py-1.5 text-xs font-medium text-white"
                onClick={cancelLookup}
              >
                {t("scanner.cancel")}
              </button>
            </div>
          ) : null}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/85 via-black/45 to-transparent pb-8 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <header className="flex items-center justify-between px-4">
            <IconBtn label={t("hairAdvisor.back")} onClick={() => navigateBack(router, "/ai-style/care")}>
              <ChevronLeft className="size-6" />
            </IconBtn>
            <div className="text-center">
              <h1 className="text-[17px] font-semibold tracking-tight">{t("scanner.title")}</h1>
              <p className="mt-0.5 text-[11px] text-white/70">{t("scanner.subtitle")}</p>
            </div>
            <IconBtn label={t("scanner.history")} onClick={() => void openHistory()}>
              <History className="size-5" />
            </IconBtn>
          </header>
          <div className="mt-3 flex justify-center px-4">
            <div className="pointer-events-auto inline-flex rounded-full bg-white/10 p-1 backdrop-blur-sm">
              <ModeChip
                active={mode === "barcode"}
                onClick={() => setMode("barcode")}
                label={t("scanner.modeBarcode")}
              />
              <ModeChip
                active={mode === "product_image"}
                onClick={() => setMode("product_image")}
                label={t("scanner.modeImage")}
              />
            </div>
          </div>
          {error ? (
            <p className="mt-3 px-5 text-center text-sm font-medium text-[#FCA5A5]" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16">
          <footer className="pointer-events-auto flex items-center justify-center gap-8 px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-3">
            <label className="inline-flex flex-col items-center gap-1">
              <span className="inline-flex size-12 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm">
                <ImageIcon className="size-5" />
              </span>
              <span className="text-[10px] text-white/80">{t("scanner.gallery")}</span>
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

            {mode === "product_image" ? (
              <button
                type="button"
                aria-label={t("scanner.captureProduct")}
                disabled={lookingUp}
                onClick={() => void onCaptureImage()}
                className="inline-flex size-[58px] items-center justify-center rounded-full bg-white text-[#111] shadow-lg ring-4 ring-white/25 disabled:opacity-60"
              >
                <span className="size-4 rounded-full border-2 border-[#111]" />
              </button>
            ) : (
              <button
                type="button"
                aria-label={t("scanner.enterCode")}
                onClick={() => setManualOpen(true)}
                className="inline-flex flex-col items-center gap-1"
              >
                <span className="inline-flex size-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm">
                  <Keyboard className="size-5" />
                </span>
                <span className="text-[10px] text-white/80">{t("scanner.enterCode")}</span>
              </button>
            )}

            <button
              type="button"
              aria-label={torch ? t("scanner.torchOff") : t("scanner.torch")}
              disabled={cameraGate !== "ready" || !cameraStreamReady}
              onClick={() => setTorch((v) => !v)}
              className="inline-flex flex-col items-center gap-1 disabled:opacity-40"
            >
              <span
                className={cn(
                  "inline-flex size-12 items-center justify-center rounded-full backdrop-blur-sm",
                  torch ? "bg-white text-[#111]" : "bg-white/15 text-white",
                )}
              >
                {torch ? <Zap className="size-5" /> : <ZapOff className="size-5" />}
              </span>
              <span className="text-[10px] text-white/80">{t("scanner.torch")}</span>
            </button>
          </footer>
        </div>

        {notFoundScan || phase === "not_found" ? (
          <HairAdvisor2NotFoundPanel
            message={notFoundScan?.message_uz || t("scanner.productNotFoundBody")}
            onRescan={resetScanner}
            onImageSearch={() => {
              setMode("product_image");
              resetScanner();
            }}
            onManualCode={() => setManualOpen(true)}
          />
        ) : null}
      </div>

      {/* Desktop side panel */}
      <aside className="hidden w-[320px] shrink-0 flex-col justify-center gap-4 rounded-3xl bg-white p-6 text-[#111] md:flex">
        <h2 className="text-lg font-semibold">{t("scanner.title")}</h2>
        <p className="text-sm text-[#71717A]">{t("scanner.subtitle")}</p>
        <p className="text-sm font-medium" role="status">
          {statusText ||
            (cameraGate === "permission_denied"
              ? t("scanner.status.permissionDenied")
              : t("scanner.status.cameraReady"))}
        </p>
        {detectedBarcode ? (
          <p className="rounded-xl bg-[#F7F7F8] px-3 py-2 font-mono text-sm">{detectedBarcode}</p>
        ) : null}
      </aside>

      {manualOpen ? (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal>
          <div className="w-full max-w-md rounded-[20px] bg-white p-5 text-[#111]">
            <h3 className="text-lg font-bold">{t("scanner.enterCode")}</h3>
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
              {t("scanner.lookingUp")}
            </button>
            <button type="button" className="mt-2 w-full py-2 text-sm text-[#71717A]" onClick={() => setManualOpen(false)}>
              {t("scanner.cancel")}
            </button>
          </div>
        </div>
      ) : null}

      {historyOpen ? (
        <HistoryModal
          history={history}
          loading={historyLoading}
          error={historyError}
          onClose={() => setHistoryOpen(false)}
          onPick={goResult}
          onScan={() => {
            setHistoryOpen(false);
            resetScanner();
          }}
        />
      ) : null}
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
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-white text-[#111]" : "bg-transparent text-white/85",
      )}
    >
      {label}
    </button>
  );
}

function PermissionBlock({ onEnable }: { onEnable: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#0a0a0a] px-8 text-center">
      <p className="text-[17px] font-semibold">{t("hairAdvisor.cameraDenied")}</p>
      <button type="button" onClick={onEnable} className="mt-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#111]">
        {t("hairAdvisor.openBarcodeCamera")}
      </button>
    </div>
  );
}

function HistoryModal({
  history,
  loading,
  error,
  onClose,
  onPick,
  onScan,
}: {
  history: HairScan[];
  loading: boolean;
  error: "load" | "unauthorized" | null;
  onClose: () => void;
  onPick: (id: string) => void;
  onScan: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" role="dialog" aria-modal>
      <div className="max-h-[70vh] w-full max-w-md overflow-y-auto rounded-t-[20px] bg-white p-5 text-[#111] sm:rounded-[20px]">
        <h3 className="text-lg font-bold">{t("scanner.history")}</h3>
        {loading ? (
          <p className="mt-6 text-sm text-[#71717A]">{t("scanner.historyLoading")}</p>
        ) : error === "unauthorized" ? (
          <p className="mt-6 text-sm text-[#71717A]">{t("scanner.historyUnauthorized")}</p>
        ) : error === "load" ? (
          <p className="mt-6 text-sm text-[#71717A]">{t("scanner.historyLoadError")}</p>
        ) : history.length === 0 ? (
          <div className="mt-6 space-y-3 text-center">
            <p className="text-base font-semibold text-[#111]">{t("scanner.historyEmptyTitle")}</p>
            <p className="text-sm text-[#71717A]">{t("scanner.historyEmptyDescription")}</p>
            <button
              type="button"
              className="mt-2 w-full rounded-2xl bg-[#111] py-3 text-sm font-semibold text-white"
              onClick={onScan}
            >
              {t("scanner.historyEmptyCta")}
            </button>
          </div>
        ) : (
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
          </ul>
        )}
        <button type="button" className="mt-4 w-full rounded-xl border py-2 text-sm font-semibold" onClick={onClose}>
          {t("scanner.cancel")}
        </button>
      </div>
    </div>
  );
}
