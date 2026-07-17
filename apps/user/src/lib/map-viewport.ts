import type { MapBounds, MapViewport } from "@mybarber/map-google";

export type { MapBounds, MapViewport };

/** O'zbekiston uchun lat/lng almashtirilgan bo'lsa tuzatadi. */
export function normalizeMapCoords(lat: number, lng: number): { lat: number; lng: number } {
  const inUzLat = (v: number) => v >= 37 && v <= 46;
  const inUzLng = (v: number) => v >= 55 && v <= 74;

  if (inUzLat(lat) && inUzLng(lng)) return { lat, lng };
  if (inUzLat(lng) && inUzLng(lat)) return { lat: lng, lng: lat };
  return { lat, lng };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Zoom + → kichik radius, zoom - → katta radius. */
function visibleRadiusKm(zoom: number): number {
  if (zoom >= 17) return 1.2;
  if (zoom >= 16) return 2;
  if (zoom >= 15) return 3.5;
  if (zoom >= 14) return 6;
  if (zoom >= 13) return 11;
  if (zoom >= 12) return 20;
  if (zoom >= 11) return 35;
  if (zoom >= 10) return 60;
  return 100;
}

function hardCapForZoom(zoom: number): number {
  if (zoom >= 15) return Number.POSITIVE_INFINITY;
  if (zoom >= 13) return 80;
  if (zoom >= 11) return 45;
  return 25;
}

export type ViewportSalon = {
  id: string;
  lat: number;
  lng: number;
};

export function filterSalonsByViewport<T extends ViewportSalon>(
  salons: T[],
  viewport: MapViewport | null,
): T[] {
  if (!viewport || salons.length === 0) return salons;

  const { centerLat, centerLng, zoom } = viewport;
  const radiusKm = visibleRadiusKm(zoom);
  const cap = hardCapForZoom(zoom);
  const indexById = new Map<string, number>();

  const inRange: T[] = [];
  salons.forEach((s, idx) => {
    indexById.set(s.id, idx);
    const { lat, lng } = normalizeMapCoords(s.lat, s.lng);
    const dist = haversineKm(centerLat, centerLng, lat, lng);
    if (dist <= radiusKm) inRange.push(s);
  });

  if (inRange.length === 0) return [];

  if (inRange.length <= cap) {
    return inRange.sort(
      (a, b) => (indexById.get(a.id) ?? 0) - (indexById.get(b.id) ?? 0),
    );
  }

  return inRange
    .map((s) => {
      const { lat, lng } = normalizeMapCoords(s.lat, s.lng);
      return {
        salon: s,
        dist: haversineKm(centerLat, centerLng, lat, lng),
        idx: indexById.get(s.id) ?? 0,
      };
    })
    .sort((a, b) => a.dist - b.dist || a.idx - b.idx)
    .slice(0, cap)
    .sort((a, b) => a.idx - b.idx)
    .map(({ salon }) => salon);
}
