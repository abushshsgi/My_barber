import { API_BASE } from "./api";

/** Vercel `next.config` rewrites orqali same-origin; brauzer to‘g‘ri Railway ga emas, shu domen orqali yuklaydi. */
export function mediaSrc(
  path: string | null | undefined,
  fallback: string
): string {
  if (!path) return fallback;
  const s = path.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) {
    try {
      const u = new URL(s);
      const base = new URL(API_BASE.replace(/\/$/, ""));
      if (u.origin === base.origin && u.pathname.startsWith("/media/")) {
        return u.pathname + u.search;
      }
    } catch {
      /* ignore */
    }
    return s;
  }
  return s.startsWith("/") ? s : `/${s}`;
}
