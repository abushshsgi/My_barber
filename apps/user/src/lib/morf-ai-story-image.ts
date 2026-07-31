/**
 * Instagram Story (9:16) — full-bleed natija + Mysaloon / Morf AI marketing overlay.
 *
 * Story tarkibi:
 *  - yuqorida Mysaloon logo + «MORF AI» chip
 *  - pastda: ism bilan sarlavha, uslub nomi, @morf.ai belgilash uchun bo‘sh joy, CTA
 * Preview’da yuz katta ko‘rinsin (kichik thumbnail uchun).
 */

const STORY_W = 1080;
const STORY_H = 1920;

/** Mysaloon logotipidagi urg‘u rangi. */
const ACCENT = "#fe841a";

/** brand-logo.png ichidagi «Mysaloon.» wordmark joylashuvi (500×500 canvas). */
const LOGO_CROP = { x: 70, y: 205, w: 360, h: 90 };

export type MorfAiStoryComposeOptions = {
  resultImageUrl: string;
  styleTitle?: string;
  /** Generatsiya qilgan odam ismi — sarlavhada ishlatiladi. */
  userName?: string;
  /** Tayyor sarlavha (berilsa userName/styleTitle’dan yasalmaydi). */
  headline?: string;
  subline?: string;
  ctaLabel?: string;
  brandLabel?: string;
  siteLabel?: string;
  /** Sarlavha ustidagi kichik urg‘u matni. */
  eyebrowLabel?: string;
  /** Story’da belgilash uchun Instagram handle. */
  mentionHandle?: string;
  mentionHint?: string;
  logoUrl?: string;
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

/** So‘zlar bo‘yicha o‘rash — maksimal `maxLines` qator, oxirgisi «…» bilan kesiladi. */
function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines && current && lines[maxLines - 1] !== current) {
    let tail = `${lines[maxLines - 1]}…`;
    while (tail.length > 2 && ctx.measureText(tail).width > maxWidth) {
      tail = `${tail.slice(0, -2)}…`;
    }
    lines[maxLines - 1] = tail;
  }
  return lines.length ? lines : [text];
}

function setLetterSpacing(ctx: CanvasRenderingContext2D, value: string) {
  // Chrome/Safari’ning yangi versiyalarida bor; bo‘lmasa e’tiborsiz qoladi.
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = value;
}

/** Yuqoridagi «Mysaloon | MORF AI» chip. */
function drawBrandChip(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | null,
  brand: string,
  font: string,
) {
  const chipH = 96;
  const chipY = 112;
  const padX = 30;
  const logoH = 40;
  const logoW = logo ? (LOGO_CROP.w / LOGO_CROP.h) * logoH : 150;
  const gap = 22;

  setLetterSpacing(ctx, "3px");
  ctx.font = `800 24px ${font}`;
  const brandW = ctx.measureText(brand).width;
  setLetterSpacing(ctx, "0px");

  const chipW = padX * 2 + logoW + gap + 2 + gap + brandW;
  const chipX = 56;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 28;
  ctx.fillStyle = "rgba(10,10,10,0.58)";
  roundRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.20)";
  ctx.lineWidth = 2;
  roundRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
  ctx.stroke();

  const centerY = chipY + chipH / 2;

  if (logo) {
    // Wordmark oq, foni qora — «screen» chip fonini saqlab qoladi.
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(
      logo,
      LOGO_CROP.x,
      LOGO_CROP.y,
      LOGO_CROP.w,
      LOGO_CROP.h,
      chipX + padX,
      centerY - logoH / 2,
      logoW,
      logoH,
    );
    ctx.restore();
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 34px ${font}`;
    ctx.fillText("Mysaloon", chipX + padX, centerY + 12);
  }

  const dividerX = chipX + padX + logoW + gap;
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(dividerX, centerY - 18, 2, 36);

  ctx.fillStyle = "#ffffff";
  setLetterSpacing(ctx, "3px");
  ctx.font = `800 24px ${font}`;
  ctx.fillText(brand, dividerX + gap, centerY + 9);
  setLetterSpacing(ctx, "0px");
}

/**
 * 1080×1920 — full-bleed natija + brend/CTA overlay (Instagram Stories uchun).
 */
export async function composeMorfAiStoryImage(opts: MorfAiStoryComposeOptions): Promise<string> {
  const brand = (opts.brandLabel || "MORF AI").trim();
  const site = (opts.siteLabel || "mysaloon.uz").trim();
  const style = (opts.styleTitle || "").trim();
  const name = (opts.userName || "").trim();
  const headline = (
    opts.headline || (name ? `${name} yangi obrazda` : "Yangi obraz — 10 soniyada")
  ).trim();
  const subline = (
    opts.subline || (style ? `${style} · Morf AI bilan yaratildi` : "Morf AI bilan yaratildi")
  ).trim();
  const cta = (opts.ctaLabel || `O‘zingizda sinab ko‘ring · ${site}`).trim();
  const mention = (opts.mentionHandle || "@morf.ai").trim();
  const mentionHint = (opts.mentionHint ?? "bu yerga belgilang").trim();

  const canvas = document.createElement("canvas");
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas mavjud emas");

  const [result, logo] = await Promise.all([
    loadImage(opts.resultImageUrl),
    loadImage(opts.logoUrl || "/brand-logo.png").catch(() => null),
  ]);

  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, STORY_W, STORY_H);
  drawCover(ctx, result, 0, 0, STORY_W, STORY_H);

  const font = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  const margin = 56;
  const contentW = STORY_W - margin * 2;

  // Yuqori scrim — chip o‘qilishi uchun.
  const topFade = ctx.createLinearGradient(0, 0, 0, 360);
  topFade.addColorStop(0, "rgba(0,0,0,0.62)");
  topFade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topFade;
  ctx.fillRect(0, 0, STORY_W, 360);

  // Pastki scrim — matn bloki uchun.
  const bottomFade = ctx.createLinearGradient(0, STORY_H - 900, 0, STORY_H);
  bottomFade.addColorStop(0, "rgba(0,0,0,0)");
  bottomFade.addColorStop(0.42, "rgba(0,0,0,0.55)");
  bottomFade.addColorStop(1, "rgba(0,0,0,0.9)");
  ctx.fillStyle = bottomFade;
  ctx.fillRect(0, STORY_H - 900, STORY_W, 900);

  drawBrandChip(ctx, logo, brand, font);

  // ---- Pastki blok: pastdan yuqoriga joylashtiriladi (IG UI zonasidan tashqarida) ----
  const bottomSafe = 232;
  const ctaH = 104;
  const ctaY = STORY_H - bottomSafe - ctaH;

  const mentionH = 104;
  const mentionY = ctaY - 30 - mentionH;

  const sublineBaseline = mentionY - 42;

  // Sarlavha — 2 qatorgacha.
  const headlineSize = fitText(ctx, headline, contentW, font, 78, 46, "800");
  ctx.font = `800 ${headlineSize}px ${font}`;
  const headlineLines = wrapLines(ctx, headline, contentW, 2);
  const lineH = Math.round(headlineSize * 1.14);
  const headlineBottom = sublineBaseline - 58;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "#ffffff";
  headlineLines.forEach((line, i) => {
    const baseline = headlineBottom - (headlineLines.length - 1 - i) * lineH;
    ctx.fillText(line, margin, baseline);
  });
  ctx.restore();

  // Eyebrow — sarlavha ustidagi urg‘u nuqtasi bilan qisqa hook.
  const eyebrow = (opts.eyebrowLabel || "SELFIEDAN 10 SONIYADA").trim().toUpperCase();
  const eyebrowBaseline = headlineBottom - (headlineLines.length - 1) * lineH - headlineSize - 26;
  ctx.beginPath();
  ctx.arc(margin + 8, eyebrowBaseline - 8, 8, 0, Math.PI * 2);
  ctx.fillStyle = ACCENT;
  ctx.fill();
  setLetterSpacing(ctx, "4px");
  ctx.font = `800 24px ${font}`;
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fillText(eyebrow, margin + 30, eyebrowBaseline);
  setLetterSpacing(ctx, "0px");

  // Uslub nomi / kichik matn.
  const sublineSize = fitText(ctx, subline, contentW, font, 34, 24, "600");
  ctx.font = `600 ${sublineSize}px ${font}`;
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.fillText(subline, margin, sublineBaseline);

  // Mention slot — @morf.ai stikerini shu joyga qo‘yish uchun bo‘sh maydon.
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  roundRect(ctx, margin, mentionY, contentW, mentionH, 30);
  ctx.fill();
  ctx.setLineDash([16, 13]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  roundRect(ctx, margin, mentionY, contentW, mentionH, 30);
  ctx.stroke();
  ctx.restore();

  const mentionSize = 38;
  const hintSize = 26;
  ctx.font = `800 ${mentionSize}px ${font}`;
  const mentionW = ctx.measureText(mention).width;
  ctx.font = `600 ${hintSize}px ${font}`;
  const hintW = mentionHint ? ctx.measureText(mentionHint).width : 0;
  const groupGap = mentionHint ? 20 : 0;
  const groupW = mentionW + groupGap + hintW;
  const groupX = margin + (contentW - groupW) / 2;
  const mentionBaseline = mentionY + mentionH / 2 + 13;

  ctx.font = `800 ${mentionSize}px ${font}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(mention, groupX, mentionBaseline);
  if (mentionHint) {
    ctx.font = `600 ${hintSize}px ${font}`;
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.fillText(mentionHint, groupX + mentionW + groupGap, mentionBaseline);
  }

  // CTA pill.
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 30;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, margin, ctaY, contentW, ctaH, ctaH / 2);
  ctx.fill();
  ctx.restore();

  const ctaSize = fitText(ctx, cta, contentW - 120, font, 36, 24, "800");
  ctx.font = `800 ${ctaSize}px ${font}`;
  ctx.fillStyle = "#0a0a0a";
  const ctaW = ctx.measureText(cta).width;
  ctx.fillText(cta, (STORY_W - ctaW) / 2, ctaY + ctaH / 2 + ctaSize * 0.36);

  // High-quality JPEG — Instagram Stories uchun yaxshiroq / kichikroq fayl
  return canvas.toDataURL("image/jpeg", 0.92);
}
