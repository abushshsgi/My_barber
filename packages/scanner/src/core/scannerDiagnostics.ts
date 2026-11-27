export type ScannerDiagnosticSnapshot = {
  platform: string;
  cameraPermission: string;
  cameraReady: boolean;
  decoderReady: boolean;
  supportedFormats: string;
  galleryDecode: string;
  lastDetectedFormat: string;
  lastBarcodeRedacted: string;
  validation: string;
  scanLock: boolean;
  productLookup: string;
  providerStatus: string;
  advisorStatus: string;
  latencyMs: number | null;
  decodePath: string;
  error: string;
};

export function emptyScannerDiagnostics(platform: string): ScannerDiagnosticSnapshot {
  return {
    platform,
    cameraPermission: "unknown",
    cameraReady: false,
    decoderReady: false,
    supportedFormats: "",
    galleryDecode: "",
    lastDetectedFormat: "none",
    lastBarcodeRedacted: "none",
    validation: "idle",
    scanLock: false,
    productLookup: "idle",
    providerStatus: "n/a",
    advisorStatus: "idle",
    latencyMs: null,
    decodePath: "none",
    error: "",
  };
}

/** Strip tokens and credential-shaped text. Does not attempt to hide product barcodes. */
export function redactDiagnosticText(text: string): string {
  return String(text || "")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, "[redacted]")
    .replace(/\b(api[_-]?key|token|secret|password|authorization)\b\s*[:=]\s*\S+/gi, "$1=[redacted]");
}

export function redactBarcode(code: string): string {
  const digits = String(code || "").replace(/\D/g, "");
  if (!digits) return "none";
  if (digits.length < 8) return `${digits.length} digits`;
  return `${digits.slice(0, 3)}***${digits.slice(-2)} (${digits.length})`;
}

export function formatScannerDiagnostics(snapshot: ScannerDiagnosticSnapshot): string {
  const error = redactDiagnosticText(snapshot.error);
  return [
    "MySaloon scanner diagnostics (development)",
    `platform: ${snapshot.platform}`,
    `cameraPermission: ${snapshot.cameraPermission}`,
    `cameraReady: ${snapshot.cameraReady ? "yes" : "no"}`,
    `decoderReady: ${snapshot.decoderReady ? "yes" : "no"}`,
    `supportedFormats: ${snapshot.supportedFormats || "n/a"}`,
    `galleryDecode: ${snapshot.galleryDecode || "n/a"}`,
    `lastDetectedFormat: ${snapshot.lastDetectedFormat || "none"}`,
    `lastBarcode: ${snapshot.lastBarcodeRedacted || "none"}`,
    `validation: ${snapshot.validation}`,
    `scanLock: ${snapshot.scanLock ? "locked" : "open"}`,
    `productLookup: ${snapshot.productLookup}`,
    `providerStatus: ${snapshot.providerStatus || "n/a"}`,
    `advisorStatus: ${snapshot.advisorStatus}`,
    `latencyMs: ${snapshot.latencyMs == null ? "n/a" : String(snapshot.latencyMs)}`,
    `decodePath: ${snapshot.decodePath || "none"}`,
    `error: ${error || "none"}`,
  ].join("\n");
}

/** Production builds stay off unless an explicit non-secret dev flag is set. */
export function scannerDiagnosticsEnabled(isDev: boolean, publicFlag?: string | null): boolean {
  if (isDev) return true;
  return String(publicFlag ?? "").trim() === "1";
}
