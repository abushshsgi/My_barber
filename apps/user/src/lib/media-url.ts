import { API_BASE } from "@/lib/api/client";
import { getPublicSiteOrigin } from "@/lib/public-origin";

const PEXELS_RE = /(?:https?:\/\/)?images\.pexels\.com\/photos\/(\d+)/i;
/** api.mysaloon.uz yoki *.railway.app dagi /media/ */
const API_MEDIA_RE =
  /^https?:\/\/(?:api\.mysaloon\.uz|[a-z0-9-]+\.up\.railway\.app)(\/media\/.+)$/i;

const DEFAULT_API_ORIGIN = "https://api.mysaloon.uz";

function isMobileSpa(): boolean {
  return (
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.VITE_MOBILE_SPA === "true"
  );
}

/** Capacitor / to‘g‘ridan-to‘g‘ri API — same-origin `/media` proxy yo‘q. */
function needsAbsoluteMedia(): boolean {
  return Boolean(API_BASE.trim()) || isMobileSpa();
}

function apiOrigin(): string {
  return (API_BASE.trim() || DEFAULT_API_ORIGIN).replace(/\/+$/, "");
}

/**
 * API yoki nisbiy media yo‘lini brauzer/Capacitor uchun yuklanadigan URL ga aylantiradi.
 * Web (Vercel): `/media/…` same-origin proxy.
 * Capacitor: `https://api.mysaloon.uz/media/…` absolute.
 */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  const raw = path?.trim();
  if (!raw) return null;

  const absolute = needsAbsoluteMedia();
  const origin = apiOrigin();
  const siteOrigin = getPublicSiteOrigin();

  const pexels = raw.match(PEXELS_RE);
  if (pexels) {
    return absolute
      ? `${siteOrigin}/covers/pexels/${pexels[1]}?w=900`
      : `/covers/pexels/${pexels[1]}?w=900`;
  }

  const apiMedia = raw.match(API_MEDIA_RE);
  if (apiMedia) {
    return absolute ? `${origin}${apiMedia[1]}` : apiMedia[1];
  }

  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
    return raw;
  }

  if (raw.startsWith("/")) {
    if (absolute) {
      if (raw.startsWith("/media/")) return `${origin}${raw}`;
      if (raw.startsWith("/covers/")) return `${siteOrigin}${raw}`;
    }
    return raw;
  }

  if (raw.startsWith("media/")) {
    const pathWithSlash = `/${raw}`;
    return absolute ? `${origin}${pathWithSlash}` : pathWithSlash;
  }

  return absolute ? `${origin}/${raw}` : `/${raw}`;
}

/**
 * Look-share / Instagram POST uchun: nisbiy /media/… ni absolute URL ga aylantiradi.
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
  if (resolved.startsWith("/")) {
    if (resolved.startsWith("/media/")) return `${apiOrigin()}${resolved}`;
    if (needsAbsoluteMedia()) return `${getPublicSiteOrigin()}${resolved}`;
    if (typeof window !== "undefined") return `${window.location.origin}${resolved}`;
    return `${getPublicSiteOrigin()}${resolved}`;
  }
  return resolved;
}
