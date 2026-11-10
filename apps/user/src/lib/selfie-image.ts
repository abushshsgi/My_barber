import {
  assessSelfieQuality,
  parseJpegOrientation,
  selfieQualityMessage,
  visibleVideoCrop,
} from "@/lib/selfie-normalize";

const MAX_SELFIE_SIDE = 1536;
const MAX_SELFIE_BYTES = 5 * 1024 * 1024;
const SELFIE_JPEG_QUALITY = 0.92;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateSelfieFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Faqat JPEG, PNG yoki WebP yuklang.";
  }
  if (file.size > MAX_SELFIE_BYTES) {
    return "Rasm hajmi 5 MB dan oshmasligi kerak.";
  }
  return null;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Rasm o'qib bo'lmadi."));
    reader.readAsDataURL(file);
  });
}

type Drawable = CanvasImageSource & { width: number; height: number };

function drawFitted(source: Drawable, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

function sampleQuality(canvas: HTMLCanvasElement): { laplacianVariance: number | null; meanLuminance: number | null } {
  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width < 3 || canvas.height < 3) {
    return { laplacianVariance: null, meanLuminance: null };
  }
  const sample = 96;
  const scale = Math.min(1, sample / Math.max(canvas.width, canvas.height));
  const width = Math.max(3, Math.round(canvas.width * scale));
  const height = Math.max(3, Math.round(canvas.height * scale));
  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    return { laplacianVariance: null, meanLuminance: null };
  }
  const gray = new Float64Array(width * height);
  let luma = 0;
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(canvas.height - 1, Math.floor((y * canvas.height) / height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(canvas.width - 1, Math.floor((x * canvas.width) / width));
      const index = (sourceY * canvas.width + sourceX) * 4;
      const value = pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114;
      gray[y * width + x] = value;
      luma += value;
    }
  }
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const center = y * width + x;
      const response =
        gray[center - width] + gray[center - 1] + gray[center + 1] + gray[center + width] - 4 * gray[center];
      sum += response;
      sumSq += response * response;
      count += 1;
    }
  }
  if (!count) return { laplacianVariance: null, meanLuminance: luma / Math.max(1, width * height) };
  const mean = sum / count;
  return {
    laplacianVariance: sumSq / count - mean * mean,
    meanLuminance: luma / (width * height),
  };
}

async function decodeOriented(dataUrl: string): Promise<Drawable> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch {
      try {
        return await createImageBitmap(blob);
      } catch {
        /* fall through to an image element */
      }
    }
  }
  const image = await loadImage(dataUrl);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const orientation = parseJpegOrientation(bytes);
  if (orientation === 1 || typeof document === "undefined") return image;
  const turns: Record<number, number> = { 3: Math.PI, 6: Math.PI / 2, 8: -Math.PI / 2 };
  const angle = turns[orientation];
  if (!angle) return image;
  const swap = orientation === 6 || orientation === 8;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? image.height : image.width;
  canvas.height = swap ? image.width : image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return image;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(angle);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  return canvas;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Rasm yuklanmadi."));
    img.src = dataUrl;
  });
}

export async function compressSelfieDataUrl(
  dataUrl: string,
  maxSide = MAX_SELFIE_SIDE,
  quality = SELFIE_JPEG_QUALITY,
  options?: { checkQuality?: boolean },
): Promise<string> {
  if (typeof document === "undefined") return dataUrl;
  const source = await decodeOriented(dataUrl);
  const canvas = drawFitted(source, maxSide);
  if (!canvas.getContext("2d")) return dataUrl;
  if (options?.checkQuality) {
    const verdict = assessSelfieQuality({
      width: canvas.width,
      height: canvas.height,
      ...sampleQuality(canvas),
    });
    if (!verdict.ok) throw new Error(selfieQualityMessage(verdict.code));
  }
  return canvas.toDataURL("image/jpeg", quality);
}

type PhotoCapture = {
  takePhoto: () => Promise<Blob>;
};

/**
 * Capture the still the user framed. Front-camera preview is mirrored once.
 * The saved frame keeps the full head when the preview would have cropped it.
 */
export async function captureSelfieFrame(
  video: HTMLVideoElement,
  stream: MediaStream | null,
): Promise<string> {
  const track = stream?.getVideoTracks()[0];
  const facingMode = track?.getSettings?.().facingMode;
  const mirror = facingMode !== "environment";
  let source: Drawable = video;
  let sourceWidth = video.videoWidth;
  let sourceHeight = video.videoHeight;
  const Capture = (
    globalThis as { ImageCapture?: new (track: MediaStreamTrack) => PhotoCapture }
  ).ImageCapture;
  if (Capture && track) {
    try {
      const blob = await new Capture(track).takePhoto();
      const bitmap = await createImageBitmap(blob);
      const videoAspect = video.videoWidth / Math.max(1, video.videoHeight);
      const photoAspect = bitmap.width / Math.max(1, bitmap.height);
      if (Math.abs(photoAspect - videoAspect) / videoAspect <= 0.08) {
        source = bitmap;
        sourceWidth = bitmap.width;
        sourceHeight = bitmap.height;
      }
    } catch {
      source = video;
      sourceWidth = video.videoWidth;
      sourceHeight = video.videoHeight;
    }
  }
  const crop = visibleVideoCrop({
    videoWidth: sourceWidth,
    videoHeight: sourceHeight,
    viewWidth: video.clientWidth || sourceWidth,
    viewHeight: video.clientHeight || sourceHeight,
  });
  const sx = crop.sx;
  const sy = crop.sy;
  const sw = Math.max(1, crop.sw);
  const sh = Math.max(1, crop.sh);
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Rasm yuklanmadi.");
  if (mirror) {
    ctx.translate(sw, 0);
    ctx.scale(-1, 1);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL("image/png");
}

export async function prepareSelfieFromFile(
  file: File,
  options?: { checkQuality?: boolean },
): Promise<string> {
  const validationError = validateSelfieFile(file);
  if (validationError) throw new Error(validationError);
  const raw = await readFileAsDataUrl(file);
  return compressSelfieDataUrl(raw, MAX_SELFIE_SIDE, SELFIE_JPEG_QUALITY, options);
}

export async function prepareSelfieDataUrl(
  dataUrl: string,
  options?: { checkQuality?: boolean },
): Promise<string> {
  return compressSelfieDataUrl(dataUrl, MAX_SELFIE_SIDE, SELFIE_JPEG_QUALITY, options);
}

/** Studio ketma-ket tahrir — 2K data URL 413 bermasligi uchun; sifat uchun 1536 + yuqori JPEG. */
const STUDIO_MAX_SIDE = 1536;
const STUDIO_JPEG_QUALITY = 0.92;

export async function prepareStudioImagePayload(image: string): Promise<string> {
  const raw = (image || "").trim();
  if (!raw) return raw;
  // Absolute / relative media URL — kichik, siqish shart emas.
  if (!raw.startsWith("data:")) return raw;
  return compressSelfieDataUrl(raw, STUDIO_MAX_SIDE, STUDIO_JPEG_QUALITY);
}
