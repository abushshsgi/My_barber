/** Lokal SVG — tashqi CDN / ORB muammosi bo‘lmaydi */
export const PLACEHOLDER_SALON = "/placeholder-salon.svg";
export const PLACEHOLDER_AVATAR = "/avatar-placeholder.svg";

/**
 * API dan kelgan rasm yo‘lini <img src> uchun moslaydi.
 * Har qanday domen + /media/... → faqat /media/... (Vercel rewrite → backend).
 * NEXT_PUBLIC_API_URL buildda xato bo‘lsa ham to‘g‘ri ishlaydi.
 */
export function mediaSrc(
  path: string | null | undefined,
  fallback: string
): string {
  if (!path) return fallback;
  const s = path.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) {
    try {
      const u = new URL(s);
      if (u.pathname.startsWith("/media/")) {
        return u.pathname + u.search;
      }
    } catch {
      /* ignore */
    }
    return s;
  }
  return s.startsWith("/") ? s : `/${s}`;
}
