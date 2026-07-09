/** Client-side 2GIS MapGL key (domain-restricted in 2GIS Console). */
export function getDgisApiKey(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const key = env.VITE_DGIS_API_KEY ?? env.NEXT_PUBLIC_DGIS_API_KEY ?? "";
  return key.trim();
}

let cachedRemoteKey: string | null | undefined;
let remoteKeyPromise: Promise<string> | null = null;

/** Build-time env bo'lmasa — backend /api/v1/geo/map-config/ dan oladi. */
export async function resolveDgisApiKey(): Promise<string> {
  const envKey = getDgisApiKey();
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
      const data = (await res.json()) as { dgis_api_key?: string };
      const key = data.dgis_api_key?.trim() ?? "";
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
