/// <reference path="../../../node_modules/@2gis/mapgl/global.d.ts" />

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

function parseMapGlPoint(raw: unknown): { lat: number; lng: number } | null {
  if (raw == null) return null;

  if (Array.isArray(raw) && raw.length >= 2) {
    const lng = Number(raw[0]);
    const lat = Number(raw[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  if (typeof raw === "object") {
    const point = raw as Record<string, unknown>;
    if (typeof point.lat === "number" && typeof point.lng === "number") {
      return { lat: point.lat, lng: point.lng };
    }
    const maybeLngLat = raw as { getLat?: () => number; getLng?: () => number };
    if (typeof maybeLngLat.getLat === "function" && typeof maybeLngLat.getLng === "function") {
      const lat = maybeLngLat.getLat();
      const lng = maybeLngLat.getLng();
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }

  return null;
}

function readBoundsCorner(bounds: unknown, corner: "southWest" | "northEast"): unknown {
  if (!bounds || typeof bounds !== "object") return null;
  const box = bounds as Record<string, unknown>;
  const direct = box[corner];
  if (direct != null) return direct;
  const getter = box[`get${corner === "southWest" ? "SouthWest" : "NorthEast"}`];
  if (typeof getter === "function") return getter.call(box);
  return null;
}

function isValidBounds(bounds: MapBounds): boolean {
  const minLat = Math.min(bounds.southWest.lat, bounds.northEast.lat);
  const maxLat = Math.max(bounds.southWest.lat, bounds.northEast.lat);
  const minLng = Math.min(bounds.southWest.lng, bounds.northEast.lng);
  const maxLng = Math.max(bounds.southWest.lng, bounds.northEast.lng);
  if (![minLat, maxLat, minLng, maxLng].every(Number.isFinite)) return false;
  return maxLat - minLat > 1e-6 || maxLng - minLng > 1e-6;
}

export function readMapViewport(map: mapgl.Map): MapViewport | null {
  try {
    const boundsRaw = map.getBounds();
    const centerRaw = map.getCenter();
    if (!boundsRaw || !centerRaw) return null;

    const sw = parseMapGlPoint(readBoundsCorner(boundsRaw, "southWest"));
    const ne = parseMapGlPoint(readBoundsCorner(boundsRaw, "northEast"));
    const c = parseMapGlPoint(centerRaw);
    if (!sw || !ne || !c) return null;

    const bounds: MapBounds = { southWest: sw, northEast: ne };
    if (!isValidBounds(bounds)) return null;

    return {
      centerLat: c.lat,
      centerLng: c.lng,
      zoom: map.getZoom() ?? 12,
      bounds,
    };
  } catch {
    return null;
  }
}
