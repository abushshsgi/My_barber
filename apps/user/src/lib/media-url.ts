import { API_BASE } from "@/lib/api/client";

const PEXELS_RE = /(?:https?:\/\/)?images\.pexels\.com\/photos\/(\d+)/i;
const API_MEDIA_RE = /^https?:\/\/api\.mysaloon\.uz(\/media\/.*)$/i;

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
    if (typeof window !== "undefined") {
      return `${window.location.origin}${raw}`;
    }
    const apiOrigin = API_BASE.replace(/\/api\/v1\/?$/i, "");
    if (apiOrigin) return `${apiOrigin}${raw}`;
    return raw;
  }
  const base = API_BASE.replace(/\/+$/, "");
  return base ? `${base}/${raw}` : `/${raw}`;
}
