import { getPublicApiBase } from "./api";

/** Lokal SVG — tashqi CDN / ORB muammosi bo‘lmaydi */
export const PLACEHOLDER_SALON = "/placeholder-salon.svg";
export const PLACEHOLDER_AVATAR = "/avatar-placeholder.svg";

/**
 * API dan kelgan rasm yo‘lini <img src> uchun moslaydi.
 * Rasmlar Railway (backend) da — Vercel domenida /media bo‘yicha 404 bo‘lmasligi uchun:
 * - To‘liq http(s) URL ni o‘zgartirmaymiz (oldingi kod pathname ga qisqartirgan, xato).
 * - Nisbiy `/media/...` ni NEXT_PUBLIC_API_URL bilan birlashtiramiz.
 */
export function mediaSrc(
  path: string | null | undefined,
  fallback: string
): string {
  if (!path) return fallback;
  const s = path.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) {
    return s;
  }
  const base = getPublicApiBase().replace(/\/$/, "");
  const pathPart = s.startsWith("/") ? s : `/${s}`;
  return `${base}${pathPart}`;
}
