const MAX_SELFIE_SIDE = 1024;
const MAX_SELFIE_BYTES = 5 * 1024 * 1024;
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

export async function compressSelfieDataUrl(
  dataUrl: string,
  maxSide = MAX_SELFIE_SIDE,
  quality = 0.88,
): Promise<string> {
  if (typeof document === "undefined") return dataUrl;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Rasm yuklanmadi."));
    img.src = dataUrl;
  });
}

export async function prepareSelfieFromFile(file: File): Promise<string> {
  const validationError = validateSelfieFile(file);
  if (validationError) throw new Error(validationError);
  const raw = await readFileAsDataUrl(file);
  return compressSelfieDataUrl(raw);
}

export async function prepareSelfieDataUrl(dataUrl: string): Promise<string> {
  return compressSelfieDataUrl(dataUrl);
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
