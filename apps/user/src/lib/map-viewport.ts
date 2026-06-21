import type { MapBounds, MapViewport } from "@mybarber/map-2gis";

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

function inBounds(lat: number, lng: number, bounds: MapBounds): boolean {
  const minLat = Math.min(bounds.southWest.lat, bounds.northEast.lat);
  const maxLat = Math.max(bounds.southWest.lat, bounds.northEast.lat);
  const minLng = Math.min(bounds.southWest.lng, bounds.northEast.lng);
  const maxLng = Math.max(bounds.southWest.lng, bounds.northEast.lng);
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

function expandBounds(bounds: MapBounds, factor = 0.06): MapBounds {
  const minLat = Math.min(bounds.southWest.lat, bounds.northEast.lat);
  const maxLat = Math.max(bounds.southWest.lat, bounds.northEast.lat);
  const minLng = Math.min(bounds.southWest.lng, bounds.northEast.lng);
  const maxLng = Math.max(bounds.southWest.lng, bounds.northEast.lng);
  const latPad = (maxLat - minLat) * factor;
  const lngPad = (maxLng - minLng) * factor;
  return {
    southWest: { lat: minLat - latPad, lng: minLng - lngPad },
    northEast: { lat: maxLat + latPad, lng: maxLng + lngPad },
  };
}

/**
 * Airbnb/Booking uslubi: zoom kattalashganda (+) ko'rinadigan maydon kichrayadi → kam salon;
 * zoom kichiklashganda (-) maydon kengayadi → ko'p salon.
 * Juda past zoomda o'qilishi uchun yuqori limit qo'llaniladi.
 */
function hardCapForZoom(zoom: number): number {
  if (zoom >= 15) return Number.POSITIVE_INFINITY;
  if (zoom >= 13) return 80;
  if (zoom >= 11) return 45;
  return 25;
}

function capSalonsByCenter<T extends ViewportSalon>(
  salons: T[],
  centerLat: number,
  centerLng: number,
  cap: number,
  indexById: Map<string, number>,
): T[] {
  if (salons.length <= cap) return salons;

  return salons
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

  const bounds = expandBounds(viewport.bounds);
  const inView: T[] = [];
  const indexById = new Map<string, number>();

  salons.forEach((s, idx) => {
    indexById.set(s.id, idx);
    const { lat, lng } = normalizeMapCoords(s.lat, s.lng);
    if (inBounds(lat, lng, bounds)) inView.push(s);
  });

  const cap = hardCapForZoom(viewport.zoom);

  if (inView.length === 0) {
    return capSalonsByCenter(salons, viewport.centerLat, viewport.centerLng, cap, indexById);
  }

  if (inView.length <= cap) {
    return inView.sort(
      (a, b) => (indexById.get(a.id) ?? 0) - (indexById.get(b.id) ?? 0),
    );
  }

  const { centerLat, centerLng } = viewport;
  return inView
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
