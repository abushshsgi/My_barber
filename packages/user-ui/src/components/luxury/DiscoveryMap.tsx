import { Map2GIS, type MapMarker } from "@mybarber/map-2gis";

export type DiscoveryMarkerItem = { id: string; lat: number; lng: number; label: string };

export function DiscoveryMap({
  center,
  markers,
  activeId,
  onMarkerClick,
  radiusKm: _radiusKm,
}: {
  center: { lat: number; lng: number } | null;
  markers: DiscoveryMarkerItem[];
  activeId: string | null;
  onMarkerClick: (id: string) => void;
  radiusKm: number;
}) {
  const mapMarkers: MapMarker[] = markers.map((m) => ({
    ...m,
    priceLabel: m.label.slice(0, 10),
  }));

  const userLocation =
    center && Number.isFinite(center.lat) && Number.isFinite(center.lng) ? center : null;

  return (
    <Map2GIS
      markers={mapMarkers}
      activeId={activeId}
      onMarkerClick={onMarkerClick}
      showUserLocation={Boolean(userLocation)}
      userLocation={userLocation}
    />
  );
}

/** @deprecated Use DiscoveryMap — kept for package API compatibility. */
export function MapView(props: Parameters<typeof DiscoveryMap>[0]) {
  return <DiscoveryMap {...props} />;
}

export { MapView as LuxuryMapView };
