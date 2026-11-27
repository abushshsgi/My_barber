/**
 * Universal Smart Scanner hook — evolves useHairAdvisorScanner with i18n status keys
 * and AbortController cancellation for stale async responses.
 */
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createHairScan, type HairScan } from "@/lib/api/hair-advisor";
import { prepareSelfieFromFile } from "@/lib/selfie-image";
import { decodeRetailBarcodeFromImage, validateRetailBarcodeChecksum } from "@/lib/hair-advisor-barcode-decode";
import { resolveScanToAnalysis } from "@/components/hair-advisor-2/scan-flow";
import {
  isDuplicateBarcodeSubmit,
  isInsufficientImageQuality,
  isScannerServiceError,
  nextPhaseAfterScan,
  statusI18nKey,
  type ScannerMode,
  type ScannerUiPhase,
} from "@/lib/hair-advisor-scanner-logic";
import { recognitionMessageFromMeta } from "@/lib/hair-advisor-recognition-feedback";

export type { ScannerMode, ScannerUiPhase };

const SUCCESS_MS = 650;

export function useSmartScanner(resultPath: (id: string) => string) {
  const router = useRouter();
  const { t } = useTranslation();
  const lockRef = useRef(false);
  const lookupInFlightRef = useRef(false);
  const lastBarcodeRef = useRef<{ code: string; at: number } | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const [phase, setPhase] = useState<ScannerUiPhase>("scanning");
  const [mode, setMode] = useState<ScannerMode>("barcode");
  const [error, setError] = useState<string | null>(null);
  const [notFoundScan, setNotFoundScan] = useState<HairScan | null>(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [offline, setOffline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine === false : false,
  );

  const clearSuccessTimer = () => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  };

  const bumpSession = () => {
    sessionRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return sessionRef.current;
  };

  useEffect(() => {
    return () => {
      clearSuccessTimer();
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setOffline(navigator.onLine === false);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  // Block remote lookup paths when offline (local decode/validate still allowed).
  const guardOnline = useCallback((): boolean => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setOffline(true);
      setError(t("scanner.status.offline"));
      return false;
    }
    return true;
  }, [t]);

  const navigateAfterResolve = useCallback(
    async (scan: HairScan, session: number) => {
      setPhase("analyzing");
      const resolved = await resolveScanToAnalysis(scan);
      if (session !== sessionRef.current) return;
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
    async (scan: HairScan, session: number) => {
      if (session !== sessionRef.current) return;
      if (scan.status === "failed") {
        setPhase("error");
        const metaMsg = recognitionMessageFromMeta(scan.recognition_meta as Record<string, unknown>);
        if (isScannerServiceError(scan)) {
          setError(metaMsg || t("scanner.errors.serviceUnavailable"));
        } else if (isInsufficientImageQuality(scan)) {
          setError(metaMsg || t("scanner.errors.imageQuality"));
        } else {
          setError(scan.error_message || metaMsg || t("scanner.errors.scanFailed"));
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
        setError(scan.error_message || t("scanner.errors.generic"));
        lockRef.current = false;
        lookupInFlightRef.current = false;
        setCameraOn(true);
        return;
      }
      await navigateAfterResolve(scan, session);
      lookupInFlightRef.current = false;
    },
    [navigateAfterResolve, router, t],
  );

  const processBarcode = useCallback(
    async (raw: string) => {
      const checksum = validateRetailBarcodeChecksum(raw);
      if (!checksum.valid) {
        setPhase("error");
        setError(t("scanner.errors.invalidBarcode"));
        return;
      }
      if (!guardOnline()) return;
      if (lockRef.current || lookupInFlightRef.current) return;
      const now = Date.now();
      const last = lastBarcodeRef.current;
      if (last && isDuplicateBarcodeSubmit(checksum.normalized, last.code, last.at, now)) {
        return;
      }
      const session = bumpSession();
      lockRef.current = true;
      lastBarcodeRef.current = { code: checksum.normalized, at: now };
      clearSuccessTimer();
      setError(null);
      setNotFoundScan(null);
      setDetectedBarcode(checksum.normalized);
      setCameraOn(false);
      setPhase("barcode_detected");

      successTimerRef.current = setTimeout(() => {
        // Cancel / remount must ignore this timer — never start a stale lookup.
        if (session !== sessionRef.current) return;
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          setPhase("error");
          setError(t("scanner.status.offline"));
          lockRef.current = false;
          lookupInFlightRef.current = false;
          setCameraOn(true);
          return;
        }
        setPhase("looking_up");
        void (async () => {
          if (session !== sessionRef.current) return;
          if (lookupInFlightRef.current) return;
          lookupInFlightRef.current = true;
          try {
            const scan = await createHairScan({
              input_method: "barcode",
              barcode: checksum.normalized,
              idempotency_key: `ha2-${checksum.normalized}`,
            });
            if (session !== sessionRef.current) return;
            await afterScanCreated(scan, session);
          } catch (e) {
            if (session !== sessionRef.current) return;
            setPhase("error");
            setError(e instanceof Error ? e.message : t("scanner.errors.network"));
            lockRef.current = false;
            lookupInFlightRef.current = false;
            setCameraOn(true);
          }
        })();
      }, SUCCESS_MS);
    },
    [afterScanCreated, guardOnline, t],
  );

  const submitManualBarcode = useCallback(
    async (raw: string) => {
      const checksum = validateRetailBarcodeChecksum(raw);
      if (raw.replace(/\D/g, "").length < 8) {
        setError(t("scanner.errors.barcodeMin"));
        return;
      }
      if (!checksum.valid) {
        setError(t("scanner.errors.invalidBarcode"));
        return;
      }
      if (!guardOnline()) return;
      const session = bumpSession();
      lockRef.current = true;
      setDetectedBarcode(checksum.normalized);
      setPhase("looking_up");
      setCameraOn(false);
      setError(null);
      try {
        const scan = await createHairScan({
          input_method: "manual_barcode",
          barcode: checksum.normalized,
          idempotency_key: `ha2-manual-${checksum.normalized}`,
        });
        await afterScanCreated(scan, session);
      } catch (e) {
        setPhase("error");
        setError(e instanceof Error ? e.message : t("scanner.errors.generic"));
        lockRef.current = false;
        setCameraOn(true);
      }
    },
    [afterScanCreated, guardOnline, t],
  );

  const captureProductImage = useCallback(
    async (dataUrl: string) => {
      if (lockRef.current) return;
      if (!guardOnline()) return;
      const session = bumpSession();
      lockRef.current = true;
      setPhase("looking_up");
      setCameraOn(false);
      setError(null);
      try {
        const scan = await createHairScan({ input_method: "camera_label", image: dataUrl });
        await afterScanCreated(scan, session);
      } catch (e) {
        setPhase("error");
        setError(e instanceof Error ? e.message : t("scanner.errors.imageFailed"));
        lockRef.current = false;
        setCameraOn(true);
      }
    },
    [afterScanCreated, guardOnline, t],
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
      if (!guardOnline()) return;
      const session = bumpSession();
      lockRef.current = true;
      setPhase("looking_up");
      setCameraOn(false);
      try {
        const dataUrl = await prepareSelfieFromFile(file);
        const scan = await createHairScan({
          input_method: mode === "product_image" ? "camera_label" : "gallery",
          image: dataUrl,
        });
        await afterScanCreated(scan, session);
      } catch (e) {
        setPhase("error");
        setError(e instanceof Error ? e.message : t("scanner.errors.imageFailed"));
        lockRef.current = false;
        setCameraOn(true);
      }
    },
    [afterScanCreated, guardOnline, mode, processBarcode, t],
  );

  const resetScanner = useCallback(() => {
    clearSuccessTimer();
    bumpSession();
    lockRef.current = false;
    lookupInFlightRef.current = false;
    setNotFoundScan(null);
    setDetectedBarcode(null);
    setError(null);
    setPhase("scanning");
    setCameraOn(true);
  }, []);

  const cancelLookup = useCallback(() => {
    clearSuccessTimer();
    bumpSession();
    lockRef.current = false;
    lookupInFlightRef.current = false;
    setPhase("scanning");
    setCameraOn(true);
    setError(null);
  }, []);

  const statusKey = offline ? "scanner.status.offline" : statusI18nKey(phase, mode);
  const statusText = statusKey
    ? t(statusKey, {
        defaultValue: "",
      })
    : "";

  return {
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
    cancelLookup,
    statusText,
    statusKey,
    offline,
    lockRef,
  };
}

/** @deprecated Use useSmartScanner */
export { useSmartScanner as useHairAdvisorScanner };
