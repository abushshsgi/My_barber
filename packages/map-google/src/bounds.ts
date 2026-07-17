import "./google-maps-types";

type FitOptions = {
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  maxZoom?: number;
};

const DEFAULT_FIT: FitOptions = {
  padding: { top: 72, right: 48, bottom: 168, left: 48 },
  maxZoom: 14,
};

export function fitMapToPoints(
  map: google.maps.Map,
  points: Array<{ lat: number; lng: number }>,
  options?: FitOptions,
): void {
  if (points.length === 0) return;

  const padding = options?.padding ?? DEFAULT_FIT.padding;
  const maxZoom = options?.maxZoom ?? DEFAULT_FIT.maxZoom ?? 14;

  if (points.length === 1) {
    map.setCenter(points[0]);
    map.setZoom(maxZoom);
    return;
  }

  const allSame = points.every(
    (p) => Math.abs(p.lat - points[0].lat) < 1e-6 && Math.abs(p.lng - points[0].lng) < 1e-6,
  );
  if (allSame) {
    map.setCenter(points[0]);
    map.setZoom(maxZoom);
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  for (const p of points) {
    bounds.extend(p);
  }

  try {
    map.fitBounds(bounds, padding);
    const listener = google.maps.event.addListenerOnce(map, "bounds_changed", () => {
      const zoom = map.getZoom();
      if (zoom != null && zoom > maxZoom) {
        map.setZoom(maxZoom);
      }
    });
    void listener;
  } catch {
    map.setCenter(points[0]);
    map.setZoom(12);
  }
}
