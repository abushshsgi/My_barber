import { API_BASE, API_ORIGIN } from "./config";

const PEXELS_RE = /(?:https?:\/\/)?images\.pexels\.com\/photos\/(\d+)/i;
/** Static Explore assets — Vercel CDN (api hostda emas). */
const SITE_ORIGIN = "https://www.mysaloon.uz";

const FALLBACK_API_HOSTS = ["api.mysaloon.uz", "up.railway.app"];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function configuredApiHosts(): string[] {
  const hosts = new Set<string>(FALLBACK_API_HOSTS);
  try {
    const h = new URL(API_ORIGIN).hostname.toLowerCase();
    if (h) hosts.add(h);
  } catch {
    /* ignore */
  }
  try {
    if (API_BASE) {
      const h = new URL(API_BASE).hostname.toLowerCase();
      if (h) hosts.add(h);
    }
  } catch {
    /* ignore */
  }
  return [...hosts];
}

/** api.mysaloon.uz, Railway, yoki sozlangan API hostdagi /media/... */
function matchApiMedia(url: string): string | null {
  for (const host of configuredApiHosts()) {
    const re =
      host === "up.railway.app"
        ? new RegExp(`^https?:\\/\\/[a-z0-9-]+\\.${escapeRe(host)}(\\/media\\/.+)$`, "i")
        : new RegExp(`^https?:\\/\\/${escapeRe(host)}(\\/media\\/.+)$`, "i");
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

function matchSiteStaticOnApiHost(url: string): string | null {
  for (const host of configuredApiHosts()) {
    const re =
      host === "up.railway.app"
        ? new RegExp(`^https?:\\/\\/[a-z0-9-]+\\.${escapeRe(host)}(\\/hairstyles\\/.+)$`, "i")
        : new RegExp(`^https?:\\/\\/${escapeRe(host)}(\\/hairstyles\\/.+)$`, "i");
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

function withWidthParam(url: string, width?: number): string {
  if (!width || width <= 0) return url;
  try {
    const u = new URL(url, API_ORIGIN || "https://api.mysaloon.uz");
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
    const mediaPath = matchApiMedia(absoluteOrPath);
    if (mediaPath) return mediaPath;
    if (absoluteOrPath.startsWith("/media/")) return absoluteOrPath;
  }
  return absoluteOrPath;
}

function siteStaticUrl(path: string): string {
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
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

  const misplacedStatic = matchSiteStaticOnApiHost(raw);
  if (misplacedStatic) {
    return siteStaticUrl(misplacedStatic);
  }

  const apiMediaPath = matchApiMedia(raw);
  if (apiMediaPath) {
    const local = toAppMediaUrl(`${API_ORIGIN}${apiMediaPath}`);
    if (!API_BASE) return local;
    return withWidthParam(`${API_BASE}${apiMediaPath}`, opts?.width);
  }

  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
    return withWidthParam(toAppMediaUrl(raw), opts?.width);
  }

  if (raw.startsWith("/hairstyles/") || raw.startsWith("/covers/")) {
    return siteStaticUrl(raw);
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
