import { useRouter } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { createHairScan, type HairScan } from "@/lib/api/hair-advisor";
import { prepareSelfieFromFile } from "@/lib/selfie-image";
import { decodeRetailBarcodeFromImage } from "@/lib/hair-advisor-barcode-decode";
import { resolveScanToAnalysis } from "@/components/hair-advisor-2/scan-flow";
import { validateRetailBarcodeChecksum } from "@/lib/hair-advisor-barcode-decode";
import {
  isDuplicateBarcodeSubmit,
  isInsufficientImageQuality,
  isScannerServiceError,
  nextPhaseAfterScan,
  statusForPhase,
  type ScannerMode,
  type ScannerUiPhase,
} from "@/lib/hair-advisor-scanner-logic";
import { recognitionMessageFromMeta } from "@/lib/hair-advisor-recognition-feedback";

export type { ScannerMode, ScannerUiPhase };

const SUCCESS_MS = 650;

export function useHairAdvisorScanner(resultPath: (id: string) => string) {
  const router = useRouter();
  const lockRef = useRef(false);
  const lookupInFlightRef = useRef(false);
  const lastBarcodeRef = useRef<{ code: string; at: number } | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase] = useState<ScannerUiPhase>("scanning");
  const [mode, setMode] = useState<ScannerMode>("barcode");
  const [error, setError] = useState<string | null>(null);
  const [notFoundScan, setNotFoundScan] = useState<HairScan | null>(null);
  const [cameraOn, setCameraOn] = useState(true);

  const clearSuccessTimer = () => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  };

  const navigateAfterResolve = useCallback(
    async (scan: HairScan) => {
      setPhase("analyzing");
      const resolved = await resolveScanToAnalysis(scan);
      if ("needIngredients" in resolved) {
        void router.navigate({ to: `/ai-style/care/ingredient/recover/${scan.id}` as never });
        return;
      }
      setPhase("completed");
      void router.navigate({ to: resultPath(resolved.scan.id) as never });
    },
    [resultPath, router],
  );

  const afterScanCreated = useCallback(
    async (scan: HairScan) => {
      if (scan.status === "failed") {
        setPhase("error");
        const metaMsg = recognitionMessageFromMeta(scan.recognition_meta as Record<string, unknown>);
        if (isScannerServiceError(scan)) {
          setError(metaMsg || "Xizmat vaqtincha band. Qayta skanerlash.");
        } else if (isInsufficientImageQuality(scan)) {
          setError(metaMsg || "Rasm sifati yetarli emas. Qayta skanerlash.");
        } else {
          setError(scan.error_message || metaMsg || "Skan muvaffaqiyatsiz");
        }
        lockRef.current = false;
        lookupInFlightRef.current = false;
        setCameraOn(true);
        return;
      }
      if (scan.status === "product_not_found") {
        setNotFoundScan(scan);
        setPhase("not_found");
        lockRef.current = false;
        lookupInFlightRef.current = false;
        return;
      }
      const route = nextPhaseAfterScan(scan);
      if (route === "pick") {
        lookupInFlightRef.current = false;
        void router.navigate({ to: `/ai-style/care/ingredient/pick/${scan.id}` as never });
        return;
      }
      if (route === "error") {
        setPhase("error");
        setError(scan.error_message || "Xatolik");
        lockRef.current = false;
        lookupInFlightRef.current = false;
        setCameraOn(true);
        return;
      }
      await navigateAfterResolve(scan);
      lookupInFlightRef.current = false;
    },
    [navigateAfterResolve, router],
  );

  const processBarcode = useCallback(
    async (raw: string) => {
      const code = raw.replace(/\D/g, "");
      if (code.length < 8 || lockRef.current || lookupInFlightRef.current) return;
      const checksum = validateRetailBarcodeChecksum(code);
      if (!checksum.valid) {
        setPhase("error");
        setError("Shtrix-kod formati noto‘g‘ri");
        return;
      }
      const now = Date.now();
      const last = lastBarcodeRef.current;
      if (last && isDuplicateBarcodeSubmit(checksum.normalized, last.code, last.at, now)) {
        return;
      }
      lockRef.current = true;
      lastBarcodeRef.current = { code: checksum.normalized, at: now };
      clearSuccessTimer();
      setError(null);
      setNotFoundScan(null);
      setCameraOn(false);
      setPhase("barcode_detected");

      successTimerRef.current = setTimeout(() => {
        setPhase("looking_up");
        void (async () => {
          if (lookupInFlightRef.current) return;
          lookupInFlightRef.current = true;
          try {
            const scan = await createHairScan({
              input_method: "barcode",
              barcode: checksum.normalized,
              idempotency_key: `ha2-${checksum.normalized}`,
            });
            await afterScanCreated(scan);
          } catch (e) {
            setPhase("error");
            setError(e instanceof Error ? e.message : "Internet aloqasini tekshiring");
            lockRef.current = false;
            lookupInFlightRef.current = false;
            setCameraOn(true);
          }
        })();
      }, SUCCESS_MS);
    },
    [afterScanCreated],
  );

  const submitManualBarcode = useCallback(
    async (raw: string) => {
      const code = raw.replace(/\D/g, "");
      if (code.length < 8) {
        setError("Kamida 8 raqamli kod kiriting");
        return;
      }
      const checksum = validateRetailBarcodeChecksum(code);
      if (!checksum.valid) {
        setError("Shtrix-kod formati noto‘g‘ri");
        return;
      }
      lockRef.current = true;
      setPhase("looking_up");
      setCameraOn(false);
      setError(null);
      try {
        const scan = await createHairScan({
          input_method: "manual_barcode",
          barcode: checksum.normalized,
          idempotency_key: `ha2-manual-${checksum.normalized}`,
        });
        await afterScanCreated(scan);
      } catch (e) {
        setPhase("error");
        setError(e instanceof Error ? e.message : "Xatolik");
        lockRef.current = false;
        setCameraOn(true);
      }
    },
    [afterScanCreated],
  );

  const captureProductImage = useCallback(
    async (dataUrl: string) => {
      if (lockRef.current) return;
      lockRef.current = true;
      setPhase("looking_up");
      setCameraOn(false);
      setError(null);
      try {
        const scan = await createHairScan({ input_method: "camera_label", image: dataUrl });
        await afterScanCreated(scan);
      } catch (e) {
        setPhase("error");
        setError(e instanceof Error ? e.message : "Rasm qayta ishlanmadi");
        lockRef.current = false;
        setCameraOn(true);
      }
    },
    [afterScanCreated],
  );

  const processGalleryFile = useCallback(
    async (file: File) => {
      if (lockRef.current) return;
      setError(null);
      if (mode === "barcode") {
        const fromBarcode = await decodeRetailBarcodeFromImage(file);
        if (fromBarcode.ok) {
          await processBarcode(fromBarcode.barcode);
          return;
        }
      }
      lockRef.current = true;
      setPhase("looking_up");
      setCameraOn(false);
      try {
        const dataUrl = await prepareSelfieFromFile(file);
        const scan = await createHairScan({
          input_method: mode === "product_image" ? "camera_label" : "gallery",
          image: dataUrl,
        });
        await afterScanCreated(scan);
      } catch (e) {
        setPhase("error");
        setError(e instanceof Error ? e.message : "Rasm o'qilmadi");
        lockRef.current = false;
        setCameraOn(true);
      }
    },
    [afterScanCreated, mode, processBarcode],
  );

  const resetScanner = useCallback(() => {
    clearSuccessTimer();
    lockRef.current = false;
    lookupInFlightRef.current = false;
    setNotFoundScan(null);
    setError(null);
    setPhase("scanning");
    setCameraOn(true);
  }, []);

  const statusText = statusForPhase(phase, mode);

  return {
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
  };
}
