import { API_BASE } from "@/lib/api/client";

const PEXELS_RE = /(?:https?:\/\/)?images\.pexels\.com\/photos\/(\d+)/i;
/** api.mysaloon.uz yoki *.railway.app dagi /media/ → same-origin proxy. */
const API_MEDIA_RE =
  /^https?:\/\/(?:api\.mysaloon\.uz|[a-z0-9-]+\.up\.railway\.app)(\/media\/.+)$/i;

/** API yoki nisbiy media yo‘lini same-origin URL ga aylantiradi. */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  const raw = path?.trim();
  if (!raw) return null;

  const pexels = raw.match(PEXELS_RE);
  if (pexels) return `/covers/pexels/${pexels[1]}?w=900`;

  const apiMedia = raw.match(API_MEDIA_RE);
  if (apiMedia) return apiMedia[1];

  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
    return raw;
  }
  if (raw.startsWith("/")) {
    return raw;
  }
  // "media/salons/..." yoki "salons/gallery/..."
  if (raw.startsWith("media/")) {
    return `/${raw}`;
  }
  const base = API_BASE.replace(/\/+$/, "");
  return base ? `${base}/${raw}` : `/${raw}`;
}

/**
 * Look-share / Instagram POST uchun: nisbiy /media/… ni absolute URL ga aylantiradi.
 * Backend storage + http(s) ikkalasini ham qabul qiladi.
 */
export function toShareImageSource(path: string | null | undefined): string {
  const resolved = resolveMediaUrl(path) ?? (path || "").trim();
  if (!resolved) return "";
  if (
    resolved.startsWith("data:") ||
    resolved.startsWith("http://") ||
    resolved.startsWith("https://")
  ) {
    return resolved;
  }
  if (typeof window !== "undefined" && resolved.startsWith("/")) {
    return `${window.location.origin}${resolved}`;
  }
  return resolved;
}
