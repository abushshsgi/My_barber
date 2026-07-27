import { resolveMediaUrl } from "@/lib/media-url";

const FALLBACK =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' rx='24' fill='%23f4f4f4'/%3E%3Ctext x='200' y='158' text-anchor='middle' font-family='Arial,sans-serif' font-size='18' fill='%23999'%3EXizmat%3C/text%3E%3C/svg%3E";

/** Partner katalog / Explore uslub rasmi. */
export function resolveServiceImageUrl(path?: string | null): string {
  const value = path?.trim() ?? "";
  if (!value) return FALLBACK;
  if (value.startsWith("data:") || value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return resolveMediaUrl(value) ?? value;
}
