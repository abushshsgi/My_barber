import { resolveDemoApiOrigin } from "@mybarber/shared/demo-env";

/** SSR / Nitro proxy upstream — brauzerda ishlatilmaydi. */
export function resolveApiUpstream(requestHost?: string | null): string {
  const demo = resolveDemoApiOrigin(requestHost);
  if (demo) return demo.replace(/\/+$/, "");
  const fromProcess =
    typeof process !== "undefined" ? process.env.API_UPSTREAM_URL?.trim() : undefined;
  return (fromProcess || "https://api.mysaloon.uz").replace(/\/+$/, "");
}

/**
 * REST fetch bazasi:
 * - Web brauzer: bo'sh (same-origin /api/v1 proxy)
 * - To'g'ridan-to'g'ri API: ENV bazasi
 * - SSR / server loader: upstream API
 */
export function resolveFetchBase(apiBase: string, requestHost?: string | null): string {
  const trimmed = apiBase.trim().replace(/\/+$/, "");
  if (trimmed) return trimmed;
  if (typeof window !== "undefined") {
    // Web brauzer: same-origin /api/v1 proxy (server hostname bo'yicha demo yoki prod upstream).
    return "";
  }
  return resolveApiUpstream(requestHost);
}
