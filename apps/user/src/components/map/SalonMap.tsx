import { Map2GIS, type MapHandle, type MapMarker, type MapViewport } from "@mybarber/map-google";

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
  onMapError,
  autoFitMarkers = true,
  fitPadding,
  fitMaxZoom,
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
  onMapError?: (message: string) => void;
  autoFitMarkers?: boolean;
  fitPadding?: { top?: number; right?: number; bottom?: number; left?: number };
  fitMaxZoom?: number;
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
      onMapError={onMapError}
      autoFitMarkers={autoFitMarkers}
      fitPadding={fitPadding}
      fitMaxZoom={fitMaxZoom}
    />
  );
}
