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

function inBounds(lat: number, lng: number, bounds: MapBounds, padFactor: number): boolean {
  const latSpan = bounds.northEast.lat - bounds.southWest.lat;
  const lngSpan = bounds.northEast.lng - bounds.southWest.lng;
  const latPad = latSpan * padFactor;
  const lngPad = lngSpan * padFactor;

  return (
    lat >= bounds.southWest.lat - latPad &&
    lat <= bounds.northEast.lat + latPad &&
    lng >= bounds.southWest.lng - lngPad &&
    lng <= bounds.northEast.lng + lngPad
  );
}

/** Zoom qanchalik katta bo'lsa, shunchalik kam marker (yaqin atrofdagilar). */
export function maxMarkersForZoom(zoom: number): number {
  if (zoom >= 16) return 8;
  if (zoom >= 14) return 14;
  if (zoom >= 12) return 24;
  if (zoom >= 10) return 40;
  return 60;
}

export function boundsPadForZoom(zoom: number): number {
  if (zoom >= 16) return 0.05;
  if (zoom >= 14) return 0.12;
  if (zoom >= 12) return 0.2;
  return 0.35;
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

  const pad = boundsPadForZoom(viewport.zoom);
  const inView = salons.filter((s) => {
    const { lat, lng } = normalizeMapCoords(s.lat, s.lng);
    return inBounds(lat, lng, viewport.bounds, pad);
  });

  const pool = inView.length > 0 ? inView : salons;
  const limit = maxMarkersForZoom(viewport.zoom);

  return [...pool]
    .map((s) => {
      const { lat, lng } = normalizeMapCoords(s.lat, s.lng);
      return {
        salon: s,
        dist: haversineKm(viewport.centerLat, viewport.centerLng, lat, lng),
      };
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit)
    .map(({ salon }) => salon);
}

