/// <reference path="../../../node_modules/@2gis/mapgl/global.d.ts" />

type FitOptions = {
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  maxZoom?: number;
};

const DEFAULT_FIT: FitOptions = {
  padding: { top: 72, right: 48, bottom: 168, left: 48 },
  maxZoom: 14,
};

/** Runtime mapgl exposes LngLatBoundsClass (not LngLatBounds). */
export function createLngLatBounds(
  mapglAPI: typeof mapgl,
  points: Array<[number, number]>,
): mapgl.LngLatBoundsClass | null {
  if (points.length === 0) return null;
  const Ctor = mapglAPI.LngLatBoundsClass;
  if (!Ctor) return null;

  const [lng0, lat0] = points[0];
  const bounds = new Ctor({
    southWest: [lng0, lat0],
    northEast: [lng0, lat0],
  });
  for (let i = 1; i < points.length; i++) {
    bounds.extend(points[i]);
  }
  return bounds;
}

export function fitMapToPoints(
  map: mapgl.Map,
  mapglAPI: typeof mapgl,
  points: Array<[number, number]>,
  options?: FitOptions,
): void {
  if (points.length === 0) return;
  if (points.length === 1) {
    map.setCenter(points[0]);
    map.setZoom(options?.maxZoom ?? 14);
    return;
  }
  const bounds = createLngLatBounds(mapglAPI, points);
  if (!bounds) {
    map.setCenter(points[0]);
    map.setZoom(12);
    return;
  }
  map.fitBounds(bounds, { ...DEFAULT_FIT, ...options });
}
