/** Shared scanner types — platform-agnostic. */

export type BarcodeFormatId =
  | "ean_13"
  | "ean_8"
  | "upc_a"
  | "upc_e"
  | "gtin_14"
  | "code_128"
  | "code_39"
  | "code_93"
  | "itf"
  | "itf_14"
  | "codabar"
  | "qr"
  | "data_matrix"
  | "pdf417"
  | "aztec"
  | "gs1_128"
  | "unknown";

export type IdentifierType =
  | "retail_gtin"
  | "logistics"
  | "internal"
  | "serial"
  | "batch"
  | "url"
  | "gs1_structured"
  | "unknown";

export interface NormalizedBarcode {
  rawValue: string;
  format: BarcodeFormatId;
  normalizedValue: string;
  gtin14?: string;
  isValid: boolean;
  identifierType: IdentifierType;
  lookupCandidates: string[];
}

export type ScannerUiPhase =
  | "idle"
  | "requesting_permission"
  | "permission_denied"
  | "initializing_camera"
  | "camera_ready"
  | "scanning"
  | "barcode_detected"
  | "validating_barcode"
  | "resolving_product"
  | "product_found"
  | "product_partial"
  | "product_not_found"
  | "image_capture"
  | "ocr_processing"
  | "confirming_product"
  | "preparing_advisor"
  | "analyzing_product"
  | "analysis_complete"
  | "offline"
  | "error"
  | "cancelled";

export type ScannerMode = "barcode" | "product_image";

export type CompatibilityLabel =
  | "potentially_suitable"
  | "mixed"
  | "potentially_unsuitable"
  | "insufficient_information";

export const SCANNER_ERROR_CODES = [
  "CAMERA_PERMISSION_DENIED",
  "CAMERA_UNAVAILABLE",
  "CAMERA_INITIALIZATION_FAILED",
  "DECODER_UNAVAILABLE",
  "INVALID_BARCODE",
  "UNSUPPORTED_BARCODE",
  "PRODUCT_NOT_FOUND",
  "PRODUCT_DATA_INCOMPLETE",
  "PROVIDER_TIMEOUT",
  "PROVIDER_RATE_LIMIT",
  "NETWORK_UNAVAILABLE",
  "IMAGE_DECODING_FAILED",
  "OCR_FAILED",
  "AI_ANALYSIS_FAILED",
  "INVALID_AI_RESPONSE",
  "SESSION_CANCELLED",
] as const;

export type ScannerErrorCode = (typeof SCANNER_ERROR_CODES)[number];
