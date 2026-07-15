/** Client-side salon photo polish before upload (canvas). */

export type EnhanceOptions = {
  /** -0.4 … 0.4 */
  brightness?: number;
  /** -0.4 … 0.4 */
  contrast?: number;
  /** -0.4 … 0.4 */
  saturation?: number;
  /** Soft auto look: slight brighten + contrast + saturation */
  preset?: "natural" | "bright" | "warm" | "crisp" | "none";
};

const PRESETS: Record<Exclude<EnhanceOptions["preset"], undefined | "none">, Required<Omit<EnhanceOptions, "preset">>> = {
  natural: { brightness: 0.04, contrast: 0.06, saturation: 0.05 },
  bright: { brightness: 0.12, contrast: 0.08, saturation: 0.04 },
  warm: { brightness: 0.06, contrast: 0.05, saturation: 0.14 },
  crisp: { brightness: 0.02, contrast: 0.16, saturation: 0.02 },
};

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

export async function enhanceImageFile(
  file: File,
  options: EnhanceOptions = { preset: "natural" },
): Promise<File> {
  const preset = options.preset && options.preset !== "none" ? PRESETS[options.preset] : null;
  const brightness = options.brightness ?? preset?.brightness ?? 0;
  const contrast = options.contrast ?? preset?.contrast ?? 0;
  const saturation = options.saturation ?? preset?.saturation ?? 0;

  if (brightness === 0 && contrast === 0 && saturation === 0) {
    return file;
  }

  const img = await loadImage(file);
  const maxSide = 1920;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return file;

  ctx.drawImage(img, 0, 0, w, h);
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

    // Subtle warm tilt for "warm" via higher red channel when saturation high
    if (saturation > 0.1) {
      r = clamp(r + saturation * 8, 0, 255);
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  if (!blob) return file;

  const base = file.name.replace(/\.[^.]+$/, "") || "salon";
  return new File([blob], `${base}-enhanced.jpg`, { type: "image/jpeg" });
}

export function blobToFile(blob: Blob, name = "camera.jpg"): File {
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}
