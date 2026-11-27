import type { ScannerMode, ScannerUiPhase } from "./scannerTypes";

/** Allowed transitions — prevent impossible UI states. */
const ALLOWED: Partial<Record<ScannerUiPhase, ScannerUiPhase[]>> = {
  idle: [
    "requesting_permission",
    "initializing_camera",
    "scanning",
    "image_capture",
    "offline",
    "cancelled",
  ],
  requesting_permission: ["permission_denied", "initializing_camera", "cancelled", "error"],
  permission_denied: ["requesting_permission", "idle", "cancelled"],
  initializing_camera: ["camera_ready", "error", "permission_denied", "cancelled"],
  camera_ready: ["scanning", "image_capture", "cancelled", "error"],
  scanning: [
    "barcode_detected",
    "validating_barcode",
    "image_capture",
    "idle",
    "offline",
    "error",
    "cancelled",
  ],
  barcode_detected: ["validating_barcode", "resolving_product", "error", "cancelled", "scanning"],
  validating_barcode: [
    "resolving_product",
    "scanning",
    "error",
    "cancelled",
    "barcode_detected",
  ],
  resolving_product: [
    "product_found",
    "product_partial",
    "product_not_found",
    "error",
    "cancelled",
    "offline",
  ],
  product_found: ["preparing_advisor", "analyzing_product", "scanning", "idle", "cancelled"],
  product_partial: [
    "confirming_product",
    "preparing_advisor",
    "image_capture",
    "scanning",
    "cancelled",
  ],
  product_not_found: ["image_capture", "ocr_processing", "scanning", "idle", "cancelled"],
  image_capture: ["ocr_processing", "validating_barcode", "scanning", "error", "cancelled"],
  ocr_processing: [
    "confirming_product",
    "product_found",
    "product_partial",
    "product_not_found",
    "error",
    "cancelled",
  ],
  confirming_product: ["preparing_advisor", "product_found", "scanning", "cancelled", "error"],
  preparing_advisor: ["analyzing_product", "cancelled", "error"],
  analyzing_product: ["analysis_complete", "error", "cancelled"],
  analysis_complete: ["idle", "scanning", "cancelled"],
  offline: ["scanning", "resolving_product", "idle", "cancelled"],
  error: ["idle", "scanning", "requesting_permission", "cancelled"],
  cancelled: ["idle", "scanning"],
};

export function canTransition(from: ScannerUiPhase, to: ScannerUiPhase): boolean {
  if (from === to) return true;
  const next = ALLOWED[from];
  return Boolean(next?.includes(to));
}

export function transitionPhase(
  from: ScannerUiPhase,
  to: ScannerUiPhase,
): { ok: true; phase: ScannerUiPhase } | { ok: false; phase: ScannerUiPhase } {
  if (canTransition(from, to)) return { ok: true, phase: to };
  return { ok: false, phase: from };
}

/** Legacy phase mapping used by existing web UI. */
export type LegacyScannerUiPhase =
  | "idle"
  | "requesting_permission"
  | "scanning"
  | "barcode_detected"
  | "looking_up"
  | "analyzing"
  | "completed"
  | "not_found"
  | "error";

export function toLegacyPhase(phase: ScannerUiPhase): LegacyScannerUiPhase {
  switch (phase) {
    case "requesting_permission":
    case "permission_denied":
      return "requesting_permission";
    case "barcode_detected":
    case "validating_barcode":
      return "barcode_detected";
    case "resolving_product":
    case "product_found":
    case "product_partial":
      return "looking_up";
    case "product_not_found":
      return "not_found";
    case "preparing_advisor":
    case "analyzing_product":
    case "ocr_processing":
    case "confirming_product":
      return "analyzing";
    case "analysis_complete":
      return "completed";
    case "error":
    case "offline":
      return "error";
    case "scanning":
    case "camera_ready":
    case "initializing_camera":
    case "image_capture":
      return "scanning";
    default:
      return "idle";
  }
}

export function statusKeyForPhase(phase: ScannerUiPhase, mode: ScannerMode): string {
  switch (phase) {
    case "requesting_permission":
      return "scanner.status.requestingPermission";
    case "permission_denied":
      return "scanner.status.permissionDenied";
    case "initializing_camera":
      return "scanner.status.initializingCamera";
    case "camera_ready":
      return "scanner.status.cameraReady";
    case "scanning":
      return mode === "product_image"
        ? "scanner.status.aimProduct"
        : "scanner.status.autoScanActive";
    case "barcode_detected":
      return "scanner.status.barcodeDetected";
    case "validating_barcode":
      return "scanner.status.validatingBarcode";
    case "resolving_product":
      return "scanner.status.lookingUpProduct";
    case "product_found":
      return "scanner.status.productFound";
    case "product_partial":
      return "scanner.status.productPartial";
    case "product_not_found":
      return "scanner.status.productNotFound";
    case "ocr_processing":
      return "scanner.status.ocrProcessing";
    case "preparing_advisor":
      return "scanner.status.preparingAdvisor";
    case "analyzing_product":
      return "scanner.status.analyzing";
    case "analysis_complete":
      return "scanner.status.complete";
    case "offline":
      return "scanner.status.offline";
    case "error":
      return "scanner.status.error";
    default:
      return mode === "product_image" ? "scanner.status.aimProduct" : "scanner.status.autoScanActive";
  }
}
