import { API_BASE } from "@/lib/api/client";

/** API yoki nisbiy media yo‘lini to‘liq URL ga aylantiradi. */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  const raw = path?.trim();
  if (!raw) return null;
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
