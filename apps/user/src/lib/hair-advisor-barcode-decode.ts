import { BarcodeFormat, DecodeHintType } from "@zxing/library";

export const HA_BARCODE_MIN_DIGITS = 8;

/** Keep retail product codes (EAN/UPC family). */
export function normalizeRetailBarcode(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < HA_BARCODE_MIN_DIGITS) return null;
  if (digits.length > 14) return digits.slice(0, 14);
  return digits;
}

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
    const normalized = normalizeRetailBarcode(result.getText());
    if (!normalized) return { ok: false, reason: "empty" };
    return { ok: true, barcode: normalized };
  } catch (e) {
    if (e && typeof e === "object" && "name" in e && (e as { name: string }).name === "NotFoundException") {
      return { ok: false, reason: "not_found" };
    }
    return { ok: false, reason: "error" };
  }
}