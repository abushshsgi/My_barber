import { Map2GIS, type MapHandle, type MapMarker, type MapViewport } from "@mybarber/map-2gis";

export type SalonMapMarker = MapMarker;
export type SalonMapHandle = MapHandle;
export type SalonMapViewport = MapViewport;

export function SalonMap({
  markers,
  selectedId,
  hoveredId,
  onMarkerSelect,
  onMarkerNavigate,
  onMarkerHover,
  onViewportChange,
  showUserLocation = false,
  userLocation = null,
  onMapReady,
  autoFitMarkers = true,
}: {
  markers: SalonMapMarker[];
  selectedId?: string | null;
  hoveredId?: string | null;
  onMarkerSelect?: (id: string | null) => void;
  onMarkerNavigate?: (id: string) => void;
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
      selectedId={selectedId}
      hoveredId={hoveredId}
      onMarkerSelect={onMarkerSelect}
      onMarkerNavigate={onMarkerNavigate}
      onMarkerHover={onMarkerHover}
      onViewportChange={onViewportChange}
      showUserLocation={showUserLocation}
      userLocation={userLocation}
      onMapReady={onMapReady}
      autoFitMarkers={autoFitMarkers}
    />
  );
}
