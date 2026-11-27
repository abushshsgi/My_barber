import { normalizeBarcode } from "./barcodeNormalizer";

export type StaticImagePlatform = "android" | "ios" | "web";

/**
 * Formats expo-camera `scanFromURLAsync` can return for a still image.
 * iOS CameraViewModule uses CIDetector QR codes only and ignores the requested list.
 * Android uses ML Kit. Neither path is the live-camera format set.
 */
export const ANDROID_STILL_IMAGE_BARCODE_TYPES = [
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "code128",
  "code39",
  "qr",
  "datamatrix",
] as const;

export const IOS_STILL_IMAGE_BARCODE_TYPES = ["qr"] as const;

/** JPEG ZXing path. Not every live-camera symbology. */
export const ZXING_STILL_IMAGE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "qr",
] as const;

export function stillImageNativeTypes(platform: StaticImagePlatform): readonly string[] {
  if (platform === "ios") return IOS_STILL_IMAGE_BARCODE_TYPES;
  if (platform === "android") return ANDROID_STILL_IMAGE_BARCODE_TYPES;
  return ["ean13", "ean8", "upc_a", "upc_e", "code128", "qr"];
}

export function galleryDecodeSummary(platform: StaticImagePlatform): string {
  if (platform === "ios") {
    return "native QR only (CIDetector); JPEG ZXing for EAN/UPC; else server image";
  }
  if (platform === "android") {
    return "ML Kit still image when available; JPEG ZXing fallback; else server image";
  }
  return "BarcodeDetector or JPEG ZXing; else server image";
}

/** TIFF/EXIF orientation → clockwise degrees. 1 and unknown stay upright. */
export function exifOrientationDegrees(orientation: number | null | undefined): 0 | 90 | 180 | 270 {
  switch (orientation) {
    case 3:
      return 180;
    case 6:
      return 90;
    case 8:
      return 270;
    default:
      return 0;
  }
}

export type GalleryBarcodeHit = { data?: string | null; type?: string | null };

export type GalleryLocalHit =
  | { ok: true; raw: string; normalized: string; format: string }
  | { ok: false; reason: "not_found" };

const RETAIL_RANK: Record<string, number> = {
  ean_13: 0,
  upc_a: 1,
  ean_8: 2,
  upc_e: 3,
  gtin_14: 4,
  itf_14: 5,
  code_128: 6,
};

/** Pick one checksum-valid retail GTIN. URLs and failed checksums are not a hit. */
export function selectGalleryBarcode(hits: GalleryBarcodeHit[]): GalleryLocalHit {
  const found: Array<{ raw: string; normalized: string; format: string; rank: number }> = [];
  for (const hit of hits) {
    const raw = String(hit.data ?? "").trim();
    if (!raw) continue;
    const normalized = normalizeBarcode(raw, hit.type);
    if (!normalized.isValid || normalized.identifierType !== "retail_gtin") continue;
    found.push({
      raw: normalized.normalizedValue || raw,
      normalized: normalized.normalizedValue,
      format: normalized.format,
      rank: RETAIL_RANK[normalized.format] ?? 50,
    });
  }
  found.sort((a, b) => a.rank - b.rank);
  const best = found[0];
  if (!best) return { ok: false, reason: "not_found" };
  return { ok: true, raw: best.raw, normalized: best.normalized, format: best.format };
}

export type GalleryNextAction =
  | { action: "lookup_barcode"; normalized: string; format: string }
  | { action: "server_image" }
  | { action: "offline" }
  | { action: "needs_auth" }
  | { action: "unreadable" }
  | { action: "cancelled" };

/**
 * Local retail hit enters the shared barcode engine.
 * Otherwise the existing authenticated image scan is used when the user is online.
 */
export function decideGalleryNextAction(input: {
  mode: "barcode" | "product_image";
  local: GalleryLocalHit;
  online: boolean;
  hasAuth: boolean;
  allowServerFallback?: boolean;
}): GalleryNextAction {
  if (input.local.ok) {
    return {
      action: "lookup_barcode",
      normalized: input.local.normalized,
      format: input.local.format,
    };
  }
  if (!input.online) return { action: "offline" };
  if (!input.hasAuth) return { action: "needs_auth" };
  if (input.allowServerFallback === false) return { action: "unreadable" };
  return { action: "server_image" };
}
