export const TASHKENT_CENTER = { lat: 41.3111, lng: 69.2797 } as const;
export const UZ_CENTER = { lat: 41.3, lng: 64.5 } as const;
export const DEFAULT_ZOOM = 13;
export const FIT_MAX_ZOOM = 15.5;
export const USER_RADIUS_M = 900;

/** @deprecated Google Maps uses LatLngLiteral; kept for call-site compatibility. */
export function toMapGlCoords(lat: number, lng: number): { lat: number; lng: number } {
  return { lat, lng };
}

/** @deprecated Google Maps uses LatLngLiteral; kept for call-site compatibility. */
export function fromMapGlCoords(coords: { lat: number; lng: number } | [number, number]): {
  lat: number;
  lng: number;
} {
  if (Array.isArray(coords)) {
    return { lat: coords[1], lng: coords[0] };
  }
  return { lat: coords.lat, lng: coords.lng };
}
