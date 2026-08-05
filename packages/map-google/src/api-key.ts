/** Client-side Google Maps JS key (HTTP-referrer restricted in Cloud Console). */

function looksLikeGoogleMapsKey(key: string): boolean {
  // Google browser keys start with AIza. Reject leftover 2GIS UUIDs.
  return key.startsWith("AIza") && key.length >= 30;
}

export function getGoogleMapsApiKey(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const key = (env.VITE_GOOGLE_MAPS_API_KEY ?? env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "").trim();
  return looksLikeGoogleMapsKey(key) ? key : "";
}

/** @deprecated use getGoogleMapsApiKey */
export const getDgisApiKey = getGoogleMapsApiKey;

let cachedRemoteKey: string | null | undefined;
let remoteKeyPromise: Promise<string> | null = null;

/** Build-time env bo'lmasa — backend /api/v1/geo/map-config/ dan oladi. */
export async function resolveGoogleMapsApiKey(): Promise<string> {
  const envKey = getGoogleMapsApiKey();
  if (envKey) return envKey;

  if (cachedRemoteKey !== undefined) return cachedRemoteKey ?? "";
  if (remoteKeyPromise) return remoteKeyPromise;

  remoteKeyPromise = (async () => {
    try {
      // Capacitor WebView da relative `/api/...` ishlamaydi — VITE_API_URL kerak.
      const env = import.meta.env as Record<string, string | undefined>;
      const apiBase = (env.VITE_API_URL ?? env.NEXT_PUBLIC_API_URL ?? "")
        .trim()
        .replace(/\/+$/, "");
      const configUrl = apiBase
        ? `${apiBase}/api/v1/geo/map-config/`
        : env.VITE_MOBILE_SPA === "true"
          ? "https://api.mysaloon.uz/api/v1/geo/map-config/"
          : "/api/v1/geo/map-config/";
      const res = await fetch(configUrl, { cache: "no-store" });
      if (!res.ok) {
        cachedRemoteKey = null;
        return "";
      }
      const data = (await res.json()) as {
        google_maps_api_key?: string;
        dgis_api_key?: string;
      };
      const candidates = [data.google_maps_api_key, data.dgis_api_key]
        .map((k) => k?.trim() ?? "")
        .filter(looksLikeGoogleMapsKey);
      const key = candidates[0] ?? "";
      cachedRemoteKey = key || null;
      return key;
    } catch {
      cachedRemoteKey = null;
      return "";
    } finally {
      remoteKeyPromise = null;
    }
  })();

  return remoteKeyPromise;
}

/** @deprecated use resolveGoogleMapsApiKey */
export const resolveDgisApiKey = resolveGoogleMapsApiKey;
