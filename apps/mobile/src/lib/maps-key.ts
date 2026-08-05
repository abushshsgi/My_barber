import { API_BASE, API_ORIGIN } from "../api/config";

function looksLikeKey(key: string): boolean {
  return key.startsWith("AIza") && key.length >= 30;
}

/** Expo env yoki backend map-config — xarita kaliti. */
export async function resolveMapsApiKey(): Promise<string> {
  const fromEnv = (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "").trim();
  if (looksLikeKey(fromEnv)) return fromEnv;

  const bases = [
    API_BASE,
    "", // Expo web Metro proxy: /api/...
    API_ORIGIN,
  ].filter((b, i, arr) => arr.indexOf(b) === i);

  for (const base of bases) {
    try {
      const url = `${base}/api/v1/geo/map-config/`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        google_maps_api_key?: string;
        dgis_api_key?: string;
      };
      const key = (data.google_maps_api_key || data.dgis_api_key || "").trim();
      if (looksLikeKey(key)) return key;
    } catch {
      /* next */
    }
  }
  return "";
}
