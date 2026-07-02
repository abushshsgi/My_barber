/** SSR / Nitro proxy upstream — brauzerda ishlatilmaydi. */
export function resolveApiUpstream(): string {
  const fromProcess =
    typeof process !== "undefined" ? process.env.API_UPSTREAM_URL?.trim() : undefined;
  return (fromProcess || "https://api.mysaloon.uz").replace(/\/+$/, "");
}

/**
 * REST fetch bazasi:
 * - Web brauzer: bo'sh (same-origin /api/v1 proxy)
 * - Capacitor / to'g'ridan-to'g'ri API: ENV bazasi
 * - SSR / server loader: upstream API
 */
export function resolveFetchBase(apiBase: string): string {
  const trimmed = apiBase.trim().replace(/\/+$/, "");
  if (trimmed) return trimmed;
  if (typeof window !== "undefined") return "";
  return resolveApiUpstream();
}
