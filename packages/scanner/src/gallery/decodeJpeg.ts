import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  GlobalHistogramBinarizer,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from "@zxing/library";
import { decode as decodeJpeg } from "jpeg-js";
import { selectGalleryBarcode } from "../core/galleryPlan";

export type JpegBarcodeHit = { text: string; format: string };

const STILL_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.QR_CODE,
];

function formatName(format: BarcodeFormat): string {
  switch (format) {
    case BarcodeFormat.EAN_13:
      return "ean_13";
    case BarcodeFormat.EAN_8:
      return "ean_8";
    case BarcodeFormat.UPC_A:
      return "upc_a";
    case BarcodeFormat.UPC_E:
      return "upc_e";
    case BarcodeFormat.CODE_128:
      return "code_128";
    case BarcodeFormat.QR_CODE:
      return "qr";
    default:
      return "unknown";
  }
}

export function rotateRgba90(
  data: Uint8Array,
  width: number,
  height: number,
): { data: Uint8Array; width: number; height: number } {
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const src = (y * width + x) * 4;
      const nx = height - 1 - y;
      const ny = x;
      const dst = (ny * height + nx) * 4;
      out[dst] = data[src] ?? 0;
      out[dst + 1] = data[src + 1] ?? 0;
      out[dst + 2] = data[src + 2] ?? 0;
      out[dst + 3] = data[src + 3] ?? 255;
    }
  }
  return { data: out, width: height, height: width };
}

function rotateRgba(
  data: Uint8Array,
  width: number,
  height: number,
  degrees: 0 | 90 | 180 | 270,
): { data: Uint8Array; width: number; height: number } {
  if (degrees === 0) return { data, width, height };
  const once = rotateRgba90(data, width, height);
  if (degrees === 90) return once;
  const twice = rotateRgba90(once.data, once.width, once.height);
  if (degrees === 180) return twice;
  return rotateRgba90(twice.data, twice.width, twice.height);
}

function rgbaToLuminance(rgba: Uint8Array, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; i < out.length; i += 1, p += 4) {
    const r = rgba[p] ?? 0;
    const g = rgba[p + 1] ?? 0;
    const b = rgba[p + 2] ?? 0;
    out[i] = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
  }
  return out;
}

function readStillImage(luma: Uint8ClampedArray, width: number, height: number): JpegBarcodeHit | null {
  if (width < 8 || height < 8) return null;
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, STILL_FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);
  const source = new RGBLuminanceSource(luma, width, height);
  const reader = new MultiFormatReader();
  reader.setHints(hints);
  const bitmaps = [
    new BinaryBitmap(new HybridBinarizer(source)),
    new BinaryBitmap(new GlobalHistogramBinarizer(source)),
  ];
  for (const bitmap of bitmaps) {
    try {
      const result = reader.decode(bitmap);
      const text = String(result.getText() || "").trim();
      if (!text) continue;
      return { text, format: formatName(result.getBarcodeFormat()) };
    } catch {
      reader.reset();
    }
  }
  return null;
}

/** All symbologies ZXing could read, including non-retail QR payloads. */
export function decodeJpegBarcodeHits(jpegBytes: Uint8Array): JpegBarcodeHit[] {
  let decoded: { data: Uint8Array; width: number; height: number };
  try {
    decoded = decodeJpeg(jpegBytes, { useTArray: true, formatAsRGBA: true });
  } catch {
    return [];
  }
  const width = decoded.width;
  const height = decoded.height;
  const rgba = decoded.data;
  if (!width || !height || rgba.length < width * height * 4) return [];

  const hits: JpegBarcodeHit[] = [];
  const seen = new Set<string>();
  for (const degrees of [0, 90, 180, 270] as const) {
    const turned = rotateRgba(rgba, width, height, degrees);
    const hit = readStillImage(
      rgbaToLuminance(turned.data, turned.width, turned.height),
      turned.width,
      turned.height,
    );
    if (!hit) continue;
    const key = `${hit.format}:${hit.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push(hit);
  }
  return hits;
}

/**
 * Retail GTIN from a JPEG, after EXIF has been baked into the pixels.
 * Returns null when the image is unreadable or has no checksum-valid product code.
 * Does not claim PDF417, Aztec, or Data Matrix support.
 */
export function decodeJpegRetailBarcode(jpegBytes: Uint8Array): { text: string; format: string } | null {
  const picked = selectGalleryBarcode(
    decodeJpegBarcodeHits(jpegBytes).map((hit) => ({ data: hit.text, type: hit.format })),
  );
  if (!picked.ok) return null;
  return { text: picked.normalized, format: picked.format };
}
