import { API_BASE } from "@/lib/api";

const API_MEDIA_RE = /^https?:\/\/(?:www\.)?api\.mysaloon\.uz(\/media\/.*)$/i;

/** API yoki nisbiy media yo‘lini same-origin URL ga aylantiradi. */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  const raw = path?.trim();
  if (!raw) return null;

  const apiMedia = raw.match(API_MEDIA_RE);
  if (apiMedia) return apiMedia[1];

  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
    return raw;
  }
  if (raw.startsWith("/")) return raw;

  const base = API_BASE.replace(/\/+$/, "");
  return base ? `${base}/${raw}` : `/${raw}`;
}
