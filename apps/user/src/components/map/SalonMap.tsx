import { Map2GIS, type MapHandle, type MapMarker, type MapViewport } from "@mybarber/map-2gis";

export type SalonMapMarker = MapMarker;
export type SalonMapHandle = MapHandle;
export type SalonMapViewport = MapViewport;

export function SalonMap({
  markers,
  activeId,
  hoveredId,
  onMarkerClick,
  onMarkerHover,
  onViewportChange,
  showUserLocation = false,
  userLocation = null,
  onMapReady,
  autoFitMarkers = true,
}: {
  markers: SalonMapMarker[];
  activeId: string | null;
  hoveredId?: string | null;
  onMarkerClick: (id: string) => void;
  onMarkerHover?: (id: string | null) => void;
  onViewportChange?: (viewport: MapViewport) => void;
  showUserLocation?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  onMapReady?: (handle: SalonMapHandle) => void;
  autoFitMarkers?: boolean;
}) {
  return (
    <Map2GIS
      markers={markers}
      activeId={activeId}
      hoveredId={hoveredId}
      onMarkerClick={onMarkerClick}
      onMarkerHover={onMarkerHover}
      onViewportChange={onViewportChange}
      showUserLocation={showUserLocation}
      userLocation={userLocation}
      onMapReady={onMapReady}
      autoFitMarkers={autoFitMarkers}
    />
  );
}
