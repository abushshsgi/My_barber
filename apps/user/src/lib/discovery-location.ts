/** Mehmon (login yo‘q) discovery joylashuvi — localStorage. */

export type DiscoveryLocation = {
  lat: number;
  lng: number;
  region?: string | null;
  regionLabel?: string | null;
  updatedAt: number;
};

const STORAGE_KEY = "mysaloon_discovery_location";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function readDiscoveryLocation(): DiscoveryLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiscoveryLocation;
    if (!isValidCoord(parsed.lat, parsed.lng)) return null;
    if (parsed.updatedAt && Date.now() - parsed.updatedAt > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDiscoveryLocation(
  loc: Omit<DiscoveryLocation, "updatedAt"> & { updatedAt?: number },
): void {
  if (typeof window === "undefined") return;
  if (!isValidCoord(loc.lat, loc.lng)) return;
  const payload: DiscoveryLocation = {
    lat: loc.lat,
    lng: loc.lng,
    region: loc.region ?? null,
    regionLabel: loc.regionLabel ?? null,
    updatedAt: loc.updatedAt ?? Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearDiscoveryLocation(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* */
  }
}
