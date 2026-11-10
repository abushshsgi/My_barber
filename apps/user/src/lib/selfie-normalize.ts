/** Shared camera and gallery decisions that do not need a canvas. */

export type SelfieQualityCode = "low_resolution" | "blur" | "lighting" | "head_cropped";

export type VideoCrop = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

const QUALITY_FALLBACK: Record<SelfieQualityCode, string> = {
  low_resolution: "This photo is too small. Retake it with your full head in the frame.",
  blur: "This photo is too blurry. Hold the camera still and retake it.",
  lighting: "The light is too dark or too bright. Retake the photo in even light.",
  head_cropped: "Your head is cropped. Step back so your forehead and hair are fully visible.",
};

export function selfieQualityMessage(code: SelfieQualityCode): string {
  return `selfie_quality:${code}`;
}

export function presentSelfieError(
  message: string,
  translate?: (key: string, fallback: string) => string,
): string {
  if (!message.startsWith("selfie_quality:")) return message;
  const code = message.slice("selfie_quality:".length) as SelfieQualityCode;
  const fallback = QUALITY_FALLBACK[code] ?? "Please retake the photo with your full head visible.";
  if (!translate) return fallback;
  const key = `aiStylePage.retake.${code}`;
  const translated = translate(key, fallback);
  if (!translated || translated === key) return fallback;
  return translated;
}

/**
 * Region of the video frame that matches the on-screen preview.
 * A crop that would remove the top or bottom of the frame is rejected so the
 * hair and forehead stay in the captured photo.
 */
export function visibleVideoCrop(input: {
  videoWidth: number;
  videoHeight: number;
  viewWidth: number;
  viewHeight: number;
}): VideoCrop {
  const videoWidth = Math.max(0, input.videoWidth);
  const videoHeight = Math.max(0, input.videoHeight);
  const full = { sx: 0, sy: 0, sw: videoWidth, sh: videoHeight };
  if (videoWidth < 2 || videoHeight < 2 || input.viewWidth < 2 || input.viewHeight < 2) {
    return full;
  }
  const scale = Math.max(input.viewWidth / videoWidth, input.viewHeight / videoHeight);
  const sw = Math.min(videoWidth, input.viewWidth / scale);
  const sh = Math.min(videoHeight, input.viewHeight / scale);
  const sx = Math.max(0, (videoWidth - sw) / 2);
  const sy = Math.max(0, (videoHeight - sh) / 2);
  const cropsTopOrBottom = sy > 1 || sy + sh < videoHeight - 1;
  if (cropsTopOrBottom) return full;
  return {
    sx: Math.round(sx),
    sy: 0,
    sw: Math.max(1, Math.round(sw)),
    sh: videoHeight,
  };
}

export function assessSelfieQuality(input: {
  width: number;
  height: number;
  laplacianVariance?: number | null;
  meanLuminance?: number | null;
}): { ok: true } | { ok: false; code: SelfieQualityCode } {
  const width = input.width;
  const height = input.height;
  if (width < 2 || height < 2) return { ok: false, code: "low_resolution" };
  if (Math.min(width, height) < 320) return { ok: false, code: "low_resolution" };
  if (width / height > 2.2 || height / width > 3.2) return { ok: false, code: "head_cropped" };
  const variance = input.laplacianVariance;
  if (typeof variance === "number" && variance < 12) return { ok: false, code: "blur" };
  const luma = input.meanLuminance;
  if (typeof luma === "number" && (luma < 28 || luma > 245)) return { ok: false, code: "lighting" };
  return { ok: true };
}

/** JPEG orientation tag, or 1 when the file does not carry one. */
export function parseJpegOrientation(bytes: Uint8Array): number {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) return 1;
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) return 1;
    const size = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (size < 2 || offset + 2 + size > bytes.length) return 1;
    if (marker === 0xe1) {
      const start = offset + 4;
      if (
        bytes[start] === 0x45 &&
        bytes[start + 1] === 0x78 &&
        bytes[start + 2] === 0x69 &&
        bytes[start + 3] === 0x66 &&
        bytes[start + 4] === 0 &&
        bytes[start + 5] === 0
      ) {
        const orientation = readTiffOrientation(bytes, start + 6, offset + 2 + size);
        if (orientation) return orientation;
      }
    }
    offset += 2 + size;
  }
  return 1;
}

function readTiffOrientation(bytes: Uint8Array, tiffStart: number, segmentEnd: number): number | null {
  if (tiffStart + 8 > segmentEnd) return null;
  const little = bytes[tiffStart] === 0x49 && bytes[tiffStart + 1] === 0x49;
  const big = bytes[tiffStart] === 0x4d && bytes[tiffStart + 1] === 0x4d;
  if (!little && !big) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const read16 = (position: number) => view.getUint16(position, little);
  const read32 = (position: number) => view.getUint32(position, little);
  if (read16(tiffStart + 2) !== 42) return null;
  let ifd = tiffStart + read32(tiffStart + 4);
  if (ifd + 2 > segmentEnd) return null;
  const count = read16(ifd);
  ifd += 2;
  for (let index = 0; index < count; index += 1) {
    const entry = ifd + index * 12;
    if (entry + 12 > segmentEnd) return null;
    if (read16(entry) === 274) {
      const value = read16(entry + 8);
      return value >= 1 && value <= 8 ? value : null;
    }
  }
  return null;
}
