/// <reference path="../../../node_modules/@2gis/mapgl/global.d.ts" />

import { fromMapGlCoords } from "./constants";

export type MapBounds = {
  southWest: { lat: number; lng: number };
  northEast: { lat: number; lng: number };
};

export type MapViewport = {
  centerLat: number;
  centerLng: number;
  zoom: number;
  bounds: MapBounds;
};

export function readMapViewport(map: mapgl.Map): MapViewport | null {
  try {
    const bounds = map.getBounds();
    const center = map.getCenter();
    if (!bounds || !center) return null;

    const sw = fromMapGlCoords(bounds.southWest as [number, number]);
    const ne = fromMapGlCoords(bounds.northEast as [number, number]);
    const c = fromMapGlCoords(center as [number, number]);

    return {
      centerLat: c.lat,
      centerLng: c.lng,
      zoom: map.getZoom() ?? 12,
      bounds: { southWest: sw, northEast: ne },
    };
  } catch {
    return null;
  }
}
