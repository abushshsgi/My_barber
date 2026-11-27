import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import {
  normalizeBarcode,
  normalizeRetailBarcode,
  validateRetailBarcodeChecksum,
} from "@mybarber/scanner";

export { normalizeBarcode, normalizeRetailBarcode, validateRetailBarcodeChecksum };
export const HA_BARCODE_MIN_DIGITS = 8;

export function retailBarcodeHints(): Map<DecodeHintType, unknown> {
  return new Map<DecodeHintType, unknown>([
    [
      DecodeHintType.POSSIBLE_FORMATS,
      [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E],
    ],
    [DecodeHintType.TRY_HARDER, true],
  ]);
}

export type DecodeFromImageResult =
  | { ok: true; barcode: string }
  | { ok: false; reason: "empty" | "not_found" | "unsupported" | "error" };

/** Decode barcode from File / data URL via ZXing (lazy-loaded). */
export async function decodeRetailBarcodeFromImage(
  source: File | string,
): Promise<DecodeFromImageResult> {
  try {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    const reader = new BrowserMultiFormatReader(retailBarcodeHints());

    let dataUrl: string;
    if (typeof source === "string") {
      dataUrl = source;
    } else {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(source);
      });
    }

    const result = await reader.decodeFromImageUrl(dataUrl);
    reader.reset();
    const normalized = normalizeBarcode(result.getText());
    if (!normalized.normalizedValue || normalized.normalizedValue.length < HA_BARCODE_MIN_DIGITS) {
      return { ok: false, reason: "empty" };
    }
    return { ok: true, barcode: normalized.normalizedValue };
  } catch (e) {
    if (e && typeof e === "object" && "name" in e && (e as { name: string }).name === "NotFoundException") {
      return { ok: false, reason: "not_found" };
    }
    return { ok: false, reason: "error" };
  }
}
