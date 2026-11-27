import type { HairScan } from "@/lib/api/hair-advisor";
import {
  isDuplicateBarcodeSubmit,
  statusKeyForPhase,
  type ScannerMode,
  type ScannerUiPhase as FullScannerUiPhase,
} from "@mybarber/scanner";

export { isDuplicateBarcodeSubmit, statusKeyForPhase };
export type { ScannerMode };

export type RecognitionMeta = {
  recognition_status?:
    | "none"
    | "exact"
    | "ambiguous"
    | "exact_match"
    | "probable_match"
    | "not_found"
    | "insufficient_image_quality"
    | "service_unavailable";
  ui_message_key?: string;
  candidate_ids?: number[];
  ocr_brand?: string;
  ocr_product_name?: string;
};

const PICK_STATUSES = new Set(["ambiguous", "probable_match"]);

export function shouldOpenProductPick(scan: HairScan): boolean {
  const meta = (scan.recognition_meta ?? {}) as RecognitionMeta;
  const status = meta.recognition_status;
  if (!status || !PICK_STATUSES.has(status)) return false;
  const listed = scan.product_candidates?.length ?? 0;
  const ids = meta.candidate_ids?.length ?? 0;
  return listed >= 1 || ids >= 1;
}

export function isScannerServiceError(scan: HairScan): boolean {
  return (
    scan.status === "failed" &&
    (scan.error_code === "service_unavailable" ||
      (scan.recognition_meta as RecognitionMeta | undefined)?.recognition_status === "service_unavailable")
  );
}

export function isInsufficientImageQuality(scan: HairScan): boolean {
  return (
    scan.status === "failed" &&
    (scan.error_code === "insufficient_image_quality" ||
      (scan.recognition_meta as RecognitionMeta | undefined)?.recognition_status === "insufficient_image_quality")
  );
}

export function nextPhaseAfterScan(scan: HairScan): "pick" | "resolve" | "not_found" | "error" {
  if (scan.status === "failed") return "error";
  if (scan.status === "product_not_found") return "not_found";
  if (shouldOpenProductPick(scan)) return "pick";
  return "resolve";
}

/** Legacy UI phases used by HairAdvisor2ScanPage. */
export type ScannerUiPhase =
  | "idle"
  | "requesting_permission"
  | "scanning"
  | "barcode_detected"
  | "looking_up"
  | "analyzing"
  | "completed"
  | "not_found"
  | "error";

const LEGACY_STATUS_KEYS: Record<ScannerUiPhase, string> = {
  idle: "scanner.status.autoScanActive",
  requesting_permission: "scanner.status.requestingPermission",
  scanning: "scanner.status.autoScanActive",
  barcode_detected: "scanner.status.barcodeDetected",
  looking_up: "scanner.status.lookingUpProduct",
  analyzing: "scanner.status.analyzing",
  completed: "scanner.status.complete",
  not_found: "",
  error: "",
};

export function statusI18nKey(phase: ScannerUiPhase, mode: ScannerMode): string {
  if (phase === "scanning" || phase === "idle") {
    return mode === "product_image" ? "scanner.status.aimProduct" : "scanner.status.autoScanActive";
  }
  if (phase === "looking_up" && mode === "product_image") {
    return "scanner.status.recognizingProduct";
  }
  return LEGACY_STATUS_KEYS[phase] || statusKeyForPhase(phase as FullScannerUiPhase, mode);
}

/** @deprecated Prefer statusI18nKey + t(); kept for tests / fallbacks. */
export function statusForPhase(phase: ScannerUiPhase, mode: ScannerMode): string {
  switch (phase) {
    case "requesting_permission":
      return "Kameraga ruxsat so‘ralmoqda…";
    case "barcode_detected":
      return "Shtrix-kod aniqlandi!";
    case "looking_up":
      return mode === "product_image" ? "Mahsulot aniqlanmoqda…" : "Mahsulot ma’lumotlari qidirilmoqda";
    case "analyzing":
      return "Soch profilingiz bilan solishtirilmoqda";
    case "not_found":
    case "error":
      return "";
    default:
      return mode === "product_image"
        ? "Shampun old qismini kameraga tuting va suratga oling"
        : "Avtomatik skanerlash faol";
  }
}
