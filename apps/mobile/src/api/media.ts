import { API_BASE, API_ORIGIN } from "./config";

const PEXELS_RE = /(?:https?:\/\/)?images\.pexels\.com\/photos\/(\d+)/i;
const API_MEDIA_RE =
  /^https?:\/\/(?:api\.mysaloon\.uz|[a-z0-9-]+\.up\.railway\.app)(\/media\/.+)$/i;

function withWidthParam(url: string, width?: number): string {
  if (!width || width <= 0) return url;
  try {
    const u = new URL(url, "https://api.mysaloon.uz");
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

function toAppMediaUrl(absoluteOrPath: string): string {
  // Web proxy: absolute api hostni same-origin /media ga aylantirish.
  if (!API_BASE) {
    const m = absoluteOrPath.match(API_MEDIA_RE);
    if (m) return m[1];
    if (absoluteOrPath.startsWith("/media/")) return absoluteOrPath;
  }
  return absoluteOrPath;
}

/** RN / web uchun yuklanadigan media URL. */
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
    const local = toAppMediaUrl(`${API_ORIGIN}${apiMedia[1]}`);
    if (!API_BASE) return local;
    return withWidthParam(`${API_BASE}${apiMedia[1]}`, opts?.width);
  }

  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
    return withWidthParam(toAppMediaUrl(raw), opts?.width);
  }

  if (raw.startsWith("/")) {
    if (!API_BASE) return raw.startsWith("/media/") ? raw : `${API_ORIGIN}${raw}`;
    return withWidthParam(`${API_BASE}${raw}`, opts?.width);
  }

  if (raw.startsWith("media/")) {
    const pathWithSlash = `/${raw}`;
    if (!API_BASE) return pathWithSlash;
    return withWidthParam(`${API_BASE}${pathWithSlash}`, opts?.width);
  }

  if (!API_BASE) return `/${raw}`;
  return withWidthParam(`${API_BASE}/${raw}`, opts?.width);
}

export function pexelsPhotoUrl(photoId: number, width = 900): string {
  const w = Math.min(Math.max(Math.round(width), 400), 1600);
  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
}
