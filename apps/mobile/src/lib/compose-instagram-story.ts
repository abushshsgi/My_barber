import { Image } from "react-native";
import { morfMarkWhite, morfWordmarkWhite } from "../branding/morf-logo";

const STORY_W = 1080;
const STORY_H = 1920;

function assetUri(mod: number): string {
  const src = Image.resolveAssetSource(mod);
  return src?.uri ?? "";
}

function mysaloonLogoUri(): string {
  return assetUri(require("../../assets/icon.png"));
}

async function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  const el = new window.Image();
  el.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("Rasm ochilmadi"));
    el.src = src;
  });
  return el;
}

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

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (w - dw) / 2, Math.min(0, (h - dh) * 0.12), dw, dh);
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  weight = "800",
) {
  let size = maxSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px system-ui, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

export async function composeInstagramStoryImage(opts: {
  resultImageUrl: string;
  styleTitle: string;
  headline: string;
  cta: string;
}): Promise<string> {
  if (typeof document === "undefined") {
    throw new Error("Instagram rasm faqat webda tayyorlanadi");
  }

  const canvas = document.createElement("canvas");
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas yo‘q");

  const [result, morfMark, morfWord, mysaloon] = await Promise.all([
    loadHtmlImage(opts.resultImageUrl),
    loadHtmlImage(assetUri(morfMarkWhite)).catch(() => null),
    loadHtmlImage(assetUri(morfWordmarkWhite)).catch(() => null),
    loadHtmlImage(mysaloonLogoUri()).catch(() => null),
  ]);

  ctx.fillStyle = "#0A0A0A";
  ctx.fillRect(0, 0, STORY_W, STORY_H);
  drawCover(ctx, result, STORY_W, STORY_H);

  const topFade = ctx.createLinearGradient(0, 0, 0, 380);
  topFade.addColorStop(0, "rgba(0,0,0,0.62)");
  topFade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topFade;
  ctx.fillRect(0, 0, STORY_W, 380);

  const bottomFade = ctx.createLinearGradient(0, STORY_H - 820, 0, STORY_H);
  bottomFade.addColorStop(0, "rgba(0,0,0,0)");
  bottomFade.addColorStop(0.4, "rgba(0,0,0,0.58)");
  bottomFade.addColorStop(1, "rgba(0,0,0,0.92)");
  ctx.fillStyle = bottomFade;
  ctx.fillRect(0, STORY_H - 820, STORY_W, 820);

  const chipH = 92;
  const chipY = 108;
  const chipX = 56;
  const pad = 22;
  const markSize = 48;
  const wordH = 36;
  const wordW = morfWord ? (morfWord.naturalWidth / morfWord.naturalHeight) * wordH : 140;
  const mySize = 48;
  const chipW = pad * 2 + markSize + 12 + wordW + 22 + mySize + 12 + 150;
  ctx.fillStyle = "rgba(10,10,10,0.62)";
  roundRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  roundRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
  ctx.stroke();

  let x = chipX + pad;
  const cy = chipY + chipH / 2;
  if (morfMark) {
    ctx.drawImage(morfMark, x, cy - markSize / 2, markSize, markSize);
    x += markSize + 10;
  }
  if (morfWord) {
    ctx.drawImage(morfWord, x, cy - wordH / 2, wordW, wordH);
    x += wordW + 16;
  } else {
    ctx.fillStyle = "#FFF";
    ctx.font = "800 28px system-ui, sans-serif";
    ctx.fillText("Morf AI", x, cy + 10);
    x += 130;
  }
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(x, cy - 16, 2, 32);
  x += 16;
  if (mysaloon) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + mySize / 2, cy, mySize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(mysaloon, x, cy - mySize / 2, mySize, mySize);
    ctx.restore();
    x += mySize + 10;
  }
  ctx.fillStyle = "#FFF";
  ctx.font = "800 26px system-ui, sans-serif";
  ctx.fillText("Mysaloon", x, cy + 9);

  const margin = 56;
  const contentW = STORY_W - margin * 2;
  const ctaH = 104;
  const ctaY = STORY_H - 220;
  const style = opts.styleTitle.trim();
  const headline = opts.headline.trim();

  const headlineSize = fitText(ctx, headline, contentW, 76, 42);
  ctx.font = `800 ${headlineSize}px system-ui, sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(headline, margin, ctaY - 150);

  if (style) {
    ctx.font = "700 36px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.86)";
    ctx.fillText(style, margin, ctaY - 88);
  }

  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, margin, ctaY, contentW, ctaH, ctaH / 2);
  ctx.fill();
  const ctaSize = fitText(ctx, opts.cta, contentW - 80, 36, 22);
  ctx.font = `800 ${ctaSize}px system-ui, sans-serif`;
  ctx.fillStyle = "#0A0A0A";
  const ctaW = ctx.measureText(opts.cta).width;
  ctx.fillText(opts.cta, (STORY_W - ctaW) / 2, ctaY + ctaH / 2 + ctaSize * 0.34);

  return canvas.toDataURL("image/jpeg", 0.92);
}

export async function downloadDataUrl(dataUrl: string, filename: string): Promise<void> {
  if (typeof document === "undefined") return;
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
