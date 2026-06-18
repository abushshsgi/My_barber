import { Map2GIS, type MapHandle, type MapMarker } from "@mybarber/map-2gis";

export type SalonMapMarker = MapMarker;
export type SalonMapHandle = MapHandle;

export function SalonMap({
  markers,
  activeId,
  onMarkerClick,
  showUserLocation = false,
  userLocation = null,
  onMapReady,
}: {
  markers: SalonMapMarker[];
  activeId: string | null;
  onMarkerClick: (id: string) => void;
  showUserLocation?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  onMapReady?: (handle: SalonMapHandle) => void;
}) {
  return (
    <Map2GIS
      markers={markers}
      activeId={activeId}
      onMarkerClick={onMarkerClick}
      showUserLocation={showUserLocation}
      userLocation={userLocation}
      onMapReady={onMapReady}
    />
  );
}
