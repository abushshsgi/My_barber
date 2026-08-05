import { API_BASE } from "./config";

const PEXELS_RE = /(?:https?:\/\/)?images\.pexels\.com\/photos\/(\d+)/i;
const API_MEDIA_RE =
  /^https?:\/\/(?:api\.mysaloon\.uz|[a-z0-9-]+\.up\.railway\.app)(\/media\/.+)$/i;

function withWidthParam(url: string, width?: number): string {
  if (!width || width <= 0) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes("pexels.com") || u.pathname.includes("/covers/pexels/")) {
      u.searchParams.set("w", String(width));
      if (u.hostname.includes("pexels.com")) {
        u.searchParams.set("auto", "compress");
        u.searchParams.set("cs", "tinysrgb");
      }
      return u.toString();
    }
  } catch {
    /* ignore */
  }
  return url;
}

/** RN uchun absolyut media URL (+ ixtiyoriy responsive width). */
export function resolveMediaUrl(
  path: string | null | undefined,
  opts?: { width?: number },
): string | null {
  const raw = path?.trim();
  if (!raw) return null;

  const pexels = raw.match(PEXELS_RE);
  if (pexels) {
    return pexelsPhotoUrl(Number(pexels[1]), opts?.width ?? 900);
  }

  const apiMedia = raw.match(API_MEDIA_RE);
  if (apiMedia) {
    return withWidthParam(`${API_BASE}${apiMedia[1]}`, opts?.width);
  }

  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
    return withWidthParam(raw, opts?.width);
  }

  if (raw.startsWith("/")) {
    return withWidthParam(`${API_BASE}${raw}`, opts?.width);
  }

  if (raw.startsWith("media/")) {
    return withWidthParam(`${API_BASE}/${raw}`, opts?.width);
  }

  return withWidthParam(`${API_BASE}/${raw}`, opts?.width);
}

export function pexelsPhotoUrl(photoId: number, width = 900): string {
  const w = Math.min(Math.max(Math.round(width), 400), 1600);
  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
}
