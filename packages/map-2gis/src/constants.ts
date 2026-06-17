export const TASHKENT_CENTER = { lat: 41.3111, lng: 69.2797 } as const;
export const UZ_CENTER = { lat: 41.3, lng: 64.5 } as const;
export const DEFAULT_ZOOM = 12;
export const USER_RADIUS_M = 900;

/** MapGL uses [lng, lat]; our apps use lat/lng. */
export function toMapGlCoords(lat: number, lng: number): [number, number] {
  return [lng, lat];
}

export function fromMapGlCoords(coords: [number, number]): { lat: number; lng: number } {
  return { lat: coords[1], lng: coords[0] };
}
