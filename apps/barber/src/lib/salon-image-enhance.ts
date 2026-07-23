/** Client-side salon photo polish + compress before upload (canvas). */

export type EnhanceOptions = {
  /** -0.4 … 0.4 */
  brightness?: number;
  /** -0.4 … 0.4 */
  contrast?: number;
  /** -0.4 … 0.4 */
  saturation?: number;
  /** Soft auto look: slight brighten + contrast + saturation */
  preset?: "natural" | "bright" | "warm" | "crisp" | "none";
  /** Max long edge in px (default 1600 — upload tezligi uchun). */
  maxSide?: number;
  /** JPEG quality 0–1 (default 0.85). */
  quality?: number;
};

const PRESETS: Record<
  Exclude<EnhanceOptions["preset"], undefined | "none">,
  Required<Omit<EnhanceOptions, "preset" | "maxSide" | "quality">>
> = {
  natural: { brightness: 0.04, contrast: 0.06, saturation: 0.05 },
  bright: { brightness: 0.12, contrast: 0.08, saturation: 0.04 },
  warm: { brightness: 0.06, contrast: 0.05, saturation: 0.14 },
  crisp: { brightness: 0.02, contrast: 0.16, saturation: 0.02 },
};

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif)$/i;

export function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  // Ba'zi Android/iOS fayllarda MIME bo‘sh bo‘ladi
  return IMAGE_EXT.test(file.name || "");
}

export function isHeicLike(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  if (t.includes("heic") || t.includes("heif")) return true;
  return /\.(heic|heif)$/i.test(file.name || "");
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Rasm yuklanmadi"));
    };
    img.src = url;
  });
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

async function canvasToJpegFile(
  canvas: HTMLCanvasElement,
  baseName: string,
  quality: number,
): Promise<File | null> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) return null;
  const base = baseName.replace(/\.[^.]+$/, "") || "salon";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

/**
 * Rasmni siqish + ixtiyoriy filtr.
 * Canvas o‘qiy olmasa (HEIC) — asl faylni qaytaradi (yoki null HEIC uchun).
 */
export async function enhanceImageFile(
  file: File,
  options: EnhanceOptions = { preset: "natural" },
): Promise<File> {
  const preset = options.preset && options.preset !== "none" ? PRESETS[options.preset] : null;
  const brightness = options.brightness ?? preset?.brightness ?? 0;
  const contrast = options.contrast ?? preset?.contrast ?? 0;
  const saturation = options.saturation ?? preset?.saturation ?? 0;
  const maxSide = options.maxSide ?? 1600;
  const quality = options.quality ?? 0.85;

  // Kichik JPEG va filtr yo‘q — qayta ishlash shart emas
  const skipFilter = brightness === 0 && contrast === 0 && saturation === 0;
  if (skipFilter && file.type === "image/jpeg" && file.size <= 900_000) {
    return file;
  }

  if (isHeicLike(file)) {
    // Ko‘p brauzerlar HEIC ni canvasda ochmaydi — aslini qaytaramiz
    return file;
  }

  try {
    const img = await loadImage(file);
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: !skipFilter });
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, w, h);

    if (!skipFilter) {
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const bAdd = brightness * 255;
      const cFactor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
      const s = 1 + saturation;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i]!;
        let g = data[i + 1]!;
        let b = data[i + 2]!;

        r = clamp(cFactor * (r - 128) + 128 + bAdd, 0, 255);
        g = clamp(cFactor * (g - 128) + 128 + bAdd, 0, 255);
        b = clamp(cFactor * (b - 128) + 128 + bAdd, 0, 255);

        const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
        r = clamp(gray + s * (r - gray), 0, 255);
        g = clamp(gray + s * (g - gray), 0, 255);
        b = clamp(gray + s * (b - gray), 0, 255);

        if (saturation > 0.1) {
          r = clamp(r + saturation * 8, 0, 255);
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }

      ctx.putImageData(imageData, 0, 0);
    }

    const out = await canvasToJpegFile(canvas, file.name || "salon", quality);
    return out ?? file;
  } catch {
    return file;
  }
}

/** Yuklash oldidan majburiy siqish (cover / multi-upload). */
export async function prepareSalonImageForUpload(
  file: File,
  options: EnhanceOptions = { preset: "natural" },
): Promise<File> {
  return enhanceImageFile(file, {
    preset: options.preset ?? "natural",
    maxSide: options.maxSide ?? 1600,
    quality: options.quality ?? 0.85,
    brightness: options.brightness,
    contrast: options.contrast,
    saturation: options.saturation,
  });
}

export function blobToFile(blob: Blob, name = "camera.jpg"): File {
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}
