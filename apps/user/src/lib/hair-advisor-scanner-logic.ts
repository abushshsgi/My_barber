import type { HairScan } from "@/lib/api/hair-advisor";

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

export function isDuplicateBarcodeSubmit(
  code: string,
  lastCode: string | null,
  lastAtMs: number,
  nowMs: number,
  windowMs = 8000,
): boolean {
  if (!lastCode || lastCode !== code) return false;
  return nowMs - lastAtMs < windowMs;
}

export function nextPhaseAfterScan(scan: HairScan): "pick" | "resolve" | "not_found" | "error" {
  if (scan.status === "failed") return "error";
  if (scan.status === "product_not_found") return "not_found";
  if (shouldOpenProductPick(scan)) return "pick";
  return "resolve";
}

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

export type ScannerMode = "barcode" | "product_image";

export function statusForPhase(phase: ScannerUiPhase, mode: ScannerMode): string {
  switch (phase) {
    case "requesting_permission":
      return "Kameraga ruxsat so‘ralmoqda…";
    case "barcode_detected":
      return "Shtrix-kod aniqlandi!";
    case "looking_up":
      return mode === "product_image" ? "Mahsulot aniqlanmoqda…" : "Mahsulot qidirilmoqda…";
    case "analyzing":
      return "Sochingiz uchun tahlil…";
    case "not_found":
    case "error":
      return "";
    default:
      return mode === "product_image"
        ? "Shampun old qismini kameraga tuting va suratga oling"
        : "Shtrix-kodni kameraga yo‘naltiring — avtomatik o‘qiladi";
  }
}
