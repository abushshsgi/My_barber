/**
 * Instagram Story (9:16) — full-bleed tayyor natija + engil Morf AI overlay.
 * Preview’da yuz katta ko‘rinsin (kichik thumbnail uchun).
 */

const STORY_W = 1080;
const STORY_H = 1920;

export type MorfAiStoryComposeOptions = {
  resultImageUrl: string;
  styleTitle?: string;
  brandLabel?: string;
  siteLabel?: string;
  ctaLabel?: string;
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

async function blobFromUrl(url: string): Promise<Blob> {
  if (url.startsWith("data:")) {
    const res = await fetch(url);
    return res.blob();
  }
  const res = await fetch(url, { mode: "cors", credentials: "omit" });
  if (!res.ok) throw new Error("Rasm yuklanmadi");
  return res.blob();
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const blob = await blobFromUrl(src);
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Rasm ochilmadi"));
      el.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Cover fill — yuz yuqoriroq (hairstyle). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = x + (w - dw) / 2;
  // Slight top bias so hair stays in frame when cropping tall.
  const dy = y + Math.min(0, (h - dh) * 0.15);
  ctx.drawImage(img, dx, dy, dw, dh);
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontFamily: string,
  maxSize: number,
  minSize: number,
  weight = "700",
) {
  let size = maxSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

/**
 * 1080×1920 — full-bleed after image (Instagram Stories preview’da katta ko‘rinadi).
 */
export async function composeMorfAiStoryImage(
  opts: MorfAiStoryComposeOptions,
): Promise<string> {
  const title = (opts.styleTitle || "Yangi look").trim();
  const brand = (opts.brandLabel || "Morf AI").trim();
  const site = (opts.siteLabel || "mysaloon.uz").trim();
  const cta = (opts.ctaLabel || "O‘zingizda sinab ko‘ring").trim();

  const canvas = document.createElement("canvas");
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas mavjud emas");

  const result = await loadImage(opts.resultImageUrl);

  // Full-bleed photo (edge-to-edge) — Instagram tanlash preview’da katta yuz.
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, STORY_W, STORY_H);
  drawCover(ctx, result, 0, 0, STORY_W, STORY_H);

  const font = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

  // Top gradient for brand readability
  const topFade = ctx.createLinearGradient(0, 0, 0, 280);
  topFade.addColorStop(0, "rgba(0,0,0,0.55)");
  topFade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topFade;
  ctx.fillRect(0, 0, STORY_W, 280);

  // Bottom gradient for title / CTA
  const bottomFade = ctx.createLinearGradient(0, STORY_H - 520, 0, STORY_H);
  bottomFade.addColorStop(0, "rgba(0,0,0,0)");
  bottomFade.addColorStop(0.35, "rgba(0,0,0,0.45)");
  bottomFade.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = bottomFade;
  ctx.fillRect(0, STORY_H - 520, STORY_W, 520);

  // Brand row
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  roundRect(ctx, 48, 72, 280, 56, 28);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 26px ${font}`;
  ctx.fillText(brand, 78, 108);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `600 22px ${font}`;
  const siteW = ctx.measureText(site).width;
  ctx.fillText(site, STORY_W - 48 - siteW, 108);

  // Style title — large
  const titleSize = fitText(ctx, title, STORY_W - 96, font, 72, 40, "800");
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${titleSize}px ${font}`;
  ctx.fillText(title, 48, STORY_H - 220);

  // CTA pill
  const pillH = 84;
  const pillY = STORY_H - 160;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 48, pillY, STORY_W - 96, pillH, 42);
  ctx.fill();
  ctx.fillStyle = "#0a0a0a";
  const ctaSize = fitText(ctx, cta, STORY_W - 160, font, 34, 24, "700");
  ctx.font = `700 ${ctaSize}px ${font}`;
  const ctaW = ctx.measureText(cta).width;
  ctx.fillText(cta, (STORY_W - ctaW) / 2, pillY + 52);

  // High-quality JPEG — Instagram Stories uchun yaxshiroq / kichikroq fayl
  return canvas.toDataURL("image/jpeg", 0.92);
}
