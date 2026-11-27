import { scanFromURLAsync, type BarcodeType } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import {
  decideGalleryNextAction,
  galleryDecodeSummary,
  selectGalleryBarcode,
  stillImageNativeTypes,
  type GalleryNextAction,
  type StaticImagePlatform,
} from "@mybarber/scanner";

export function currentStillImagePlatform(): StaticImagePlatform {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

export function currentGalleryDecodeSummary(): string {
  return galleryDecodeSummary(currentStillImagePlatform());
}

export type GalleryPrepared = {
  action: GalleryNextAction;
  dataUrl: string | null;
  decodePath: "native" | "zxing" | "none";
};

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/^data:image\/\w+;base64,/, "");
  const bin = globalThis.atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i) & 255;
  return out;
}

async function bakeOrientedJpeg(
  uri: string,
  width: number | null,
): Promise<{ uri: string; base64: string | null }> {
  const actions = width && width > 1600 ? [{ resize: { width: 1600 } }] : [];
  const result = await manipulateAsync(uri, actions, {
    compress: 0.92,
    format: SaveFormat.JPEG,
    base64: true,
  });
  return { uri: result.uri, base64: result.base64 ?? null };
}

async function uriToDataUrl(uri: string, base64: string | null): Promise<string | null> {
  if (base64) return `data:image/jpeg;base64,${base64}`;
  try {
    const file = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return file ? `data:image/jpeg;base64,${file}` : null;
  } catch {
    return null;
  }
}

/**
 * Still-image decode for the existing scanner.
 * Native expo-camera first (Android ML Kit / iOS QR only), then JPEG ZXing.
 * Does not upload the photo.
 */
export async function prepareGalleryScan(input: {
  uri: string;
  width: number | null;
  mode: "barcode" | "product_image";
  online: boolean;
  hasAuth: boolean;
  signal?: AbortSignal;
}): Promise<GalleryPrepared> {
  if (input.signal?.aborted) {
    return { action: { action: "cancelled" }, dataUrl: null, decodePath: "none" };
  }

  let bakedUri = input.uri;
  let base64: string | null = null;
  try {
    const baked = await bakeOrientedJpeg(input.uri, input.width);
    bakedUri = baked.uri;
    base64 = baked.base64;
  } catch {
    bakedUri = input.uri;
  }

  if (input.signal?.aborted) {
    return { action: { action: "cancelled" }, dataUrl: null, decodePath: "none" };
  }

  const platform = currentStillImagePlatform();
  let decodePath: GalleryPrepared["decodePath"] = "none";
  let local = selectGalleryBarcode([]);

  try {
    const types = [...stillImageNativeTypes(platform)] as BarcodeType[];
    const native = await scanFromURLAsync(bakedUri, types);
    local = selectGalleryBarcode(native.map((row) => ({ data: row.data, type: row.type })));
    if (local.ok) decodePath = "native";
  } catch {
    local = selectGalleryBarcode([]);
  }

  if (!local.ok && base64) {
    try {
      const { decodeJpegBarcodeHits } = await import("@mybarber/scanner/gallery");
      const hits = decodeJpegBarcodeHits(base64ToBytes(base64));
      const picked = selectGalleryBarcode(hits.map((hit) => ({ data: hit.text, type: hit.format })));
      if (picked.ok) {
        local = picked;
        decodePath = "zxing";
      }
    } catch {
      /* JPEG decoder unavailable — server image path remains. */
    }
  }

  if (input.signal?.aborted) {
    return { action: { action: "cancelled" }, dataUrl: null, decodePath };
  }

  const action = decideGalleryNextAction({
    mode: input.mode,
    local,
    online: input.online,
    hasAuth: input.hasAuth,
  });
  const dataUrl = action.action === "server_image" ? await uriToDataUrl(bakedUri, base64) : null;
  return { action, dataUrl, decodePath };
}
