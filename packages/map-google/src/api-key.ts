/** Client-side Google Maps JS key (HTTP-referrer restricted in Cloud Console). */
export function getGoogleMapsApiKey(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const key =
    env.VITE_GOOGLE_MAPS_API_KEY ??
    env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
    env.VITE_DGIS_API_KEY ??
    "";
  return key.trim();
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
      const res = await fetch("/api/v1/geo/map-config/", { cache: "no-store" });
      if (!res.ok) {
        cachedRemoteKey = null;
        return "";
      }
      const data = (await res.json()) as {
        google_maps_api_key?: string;
        dgis_api_key?: string;
      };
      const key = (data.google_maps_api_key ?? data.dgis_api_key)?.trim() ?? "";
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
