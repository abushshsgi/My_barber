/**
 * Instagram Story (9:16) — faqat tayyor natija + Morf AI shablon.
 * Before/after emas.
 */

const STORY_W = 1080;
const STORY_H = 1920;

export type MorfAiStoryComposeOptions = {
  /** Tayyor try-on natija (after) — data URL yoki absolute/relative URL */
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
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Rasm ochilmadi"));
      el.src = objectUrl;
    });
    return img;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  /** Prefer top of head for hairstyle shots */
  focus: "top" | "center" = "top",
) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = x + (w - dw) / 2;
  const dy = focus === "top" ? y : y + (h - dh) / 2;
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
 * 1080×1920 PNG data URL — Instagram Story uchun tayyor shablon.
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

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, STORY_H);
  bg.addColorStop(0, "#141414");
  bg.addColorStop(0.45, "#0a0a0a");
  bg.addColorStop(1, "#111111");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  // Soft accent glow (top)
  const glow = ctx.createRadialGradient(STORY_W * 0.5, 0, 40, STORY_W * 0.5, 120, 700);
  glow.addColorStop(0, "rgba(244, 114, 182, 0.22)");
  glow.addColorStop(0.5, "rgba(168, 85, 247, 0.1)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, STORY_W, 900);

  const font = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

  // Brand chip
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, 72, 96, 320, 64, 32);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 28px ${font}`;
  ctx.fillText(brand, 108, 138);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `600 22px ${font}`;
  ctx.fillText(site, STORY_W - 72 - ctx.measureText(site).width, 138);

  // Photo frame
  const frameX = 64;
  const frameY = 220;
  const frameW = STORY_W - 128;
  const frameH = 1280;
  const frameR = 48;

  ctx.save();
  roundRect(ctx, frameX, frameY, frameW, frameH, frameR);
  ctx.clip();
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(frameX, frameY, frameW, frameH);

  const result = await loadImage(opts.resultImageUrl);
  drawCover(ctx, result, frameX, frameY, frameW, frameH, "top");

  // Bottom gradient on photo
  const fade = ctx.createLinearGradient(0, frameY + frameH * 0.55, 0, frameY + frameH);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = fade;
  ctx.fillRect(frameX, frameY, frameW, frameH);
  ctx.restore();

  // Frame border
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 3;
  roundRect(ctx, frameX, frameY, frameW, frameH, frameR);
  ctx.stroke();

  // Title over photo bottom
  const titleSize = fitText(ctx, title, frameW - 80, font, 56, 32);
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${titleSize}px ${font}`;
  ctx.fillText(title, frameX + 40, frameY + frameH - 56);

  // CTA block
  const ctaY = frameY + frameH + 56;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 64, ctaY, STORY_W - 128, 88, 44);
  ctx.fill();
  ctx.fillStyle = "#0a0a0a";
  const ctaSize = fitText(ctx, cta, STORY_W - 200, font, 34, 24, "700");
  ctx.font = `700 ${ctaSize}px ${font}`;
  const ctaW = ctx.measureText(cta).width;
  ctx.fillText(cta, (STORY_W - ctaW) / 2, ctaY + 54);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `600 24px ${font}`;
  const hint = "Link sticker bilan havolani qo‘shing";
  const hintW = ctx.measureText(hint).width;
  ctx.fillText(hint, (STORY_W - hintW) / 2, ctaY + 140);

  return canvas.toDataURL("image/png");
}
