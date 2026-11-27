import type { BarcodeFormatId } from "./scannerTypes";

/** Primary retail formats for live camera (performance-optimized). */
export const PRIMARY_LIVE_FORMATS: BarcodeFormatId[] = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "data_matrix",
];

/** Extended formats — gallery / optional live. */
export const EXTENDED_FORMATS: BarcodeFormatId[] = [
  "code_128",
  "code_39",
  "code_93",
  "itf",
  "itf_14",
  "codabar",
  "qr",
  "pdf417",
  "aztec",
  "gs1_128",
];

export const RETAIL_GTIN_FORMATS: BarcodeFormatId[] = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "gtin_14",
  "itf_14",
];

/** Map common decoder labels to canonical format ids. */
export function mapDecoderFormat(raw: string | undefined | null): BarcodeFormatId {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const table: Record<string, BarcodeFormatId> = {
    ean_13: "ean_13",
    ean13: "ean_13",
    ean_8: "ean_8",
    ean8: "ean_8",
    upc_a: "upc_a",
    upca: "upc_a",
    upc_e: "upc_e",
    upce: "upc_e",
    gtin_14: "gtin_14",
    gtin14: "gtin_14",
    code_128: "code_128",
    code128: "code_128",
    code_39: "code_39",
    code39: "code_39",
    code_93: "code_93",
    code93: "code_93",
    itf: "itf",
    interleaved_2_of_5: "itf",
    itf_14: "itf_14",
    itf14: "itf_14",
    codabar: "codabar",
    qr: "qr",
    qr_code: "qr",
    data_matrix: "data_matrix",
    datamatrix: "data_matrix",
    pdf417: "pdf417",
    pdf_417: "pdf417",
    aztec: "aztec",
    gs1_128: "gs1_128",
  };
  return table[s] ?? "unknown";
}

/** Expo-camera barcodeTypes for primary retail live scan. */
export const EXPO_PRIMARY_BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e"] as const;

/** Optional extended Expo types when needed. */
export const EXPO_EXTENDED_BARCODE_TYPES = [
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "code128",
  "code39",
  "qr",
  "datamatrix",
] as const;
