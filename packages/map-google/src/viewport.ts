import "./google-maps-types";

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

function isValidBounds(bounds: MapBounds): boolean {
  const minLat = Math.min(bounds.southWest.lat, bounds.northEast.lat);
  const maxLat = Math.max(bounds.southWest.lat, bounds.northEast.lat);
  const minLng = Math.min(bounds.southWest.lng, bounds.northEast.lng);
  const maxLng = Math.max(bounds.southWest.lng, bounds.northEast.lng);
  if (![minLat, maxLat, minLng, maxLng].every(Number.isFinite)) return false;
  return maxLat - minLat > 1e-6 || maxLng - minLng > 1e-6;
}

export function readMapViewport(map: google.maps.Map): MapViewport | null {
  try {
    const boundsRaw = map.getBounds();
    const centerRaw = map.getCenter();
    if (!boundsRaw || !centerRaw) return null;

    const sw = boundsRaw.getSouthWest();
    const ne = boundsRaw.getNorthEast();
    const bounds: MapBounds = {
      southWest: { lat: sw.lat(), lng: sw.lng() },
      northEast: { lat: ne.lat(), lng: ne.lng() },
    };
    if (!isValidBounds(bounds)) return null;

    return {
      centerLat: centerRaw.lat(),
      centerLng: centerRaw.lng(),
      zoom: map.getZoom() ?? 12,
      bounds,
    };
  } catch {
    return null;
  }
}
