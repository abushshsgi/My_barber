import { useEffect, useRef } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type SalonMapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind: "salon" | "barber";
};

const TASHKENT: [number, number] = [41.3111, 69.2797];

function makePinIcon(active: boolean, kind: "salon" | "barber") {
  const size = active ? 44 : 34;
  const bg = active ? "#141414" : kind === "salon" ? "#141414" : "#3d3d3d";
  const ring = active ? "0 0 0 4px rgba(20,20,20,0.18)" : "0 2px 8px rgba(0,0,0,0.22)";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${bg};color:#faf8f5;
      display:grid;place-items:center;
      box-shadow:${ring};
      border:2.5px solid #faf8f5;
      transition:transform 0.2s ease;
      transform:scale(${active ? 1.08 : 1});
    ">
      <svg width="${active ? 18 : 14}" height="${active ? 18 : 14}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
      </svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const userIcon = L.divIcon({
  className: "",
  html: `<span style="
    display:block;width:16px;height:16px;border-radius:9999px;
    background:#141414;border:3px solid #faf8f5;
    box-shadow:0 0 0 6px rgba(20,20,20,0.15);
  "></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FlyToActive({
  activeId,
  markers,
}: {
  activeId: string | null;
  markers: SalonMapMarker[];
}) {
  const map = useMap();
  useEffect(() => {
    if (!activeId) return;
    const m = markers.find((x) => x.id === activeId);
    if (!m) return;
    map.flyTo([m.lat, m.lng], Math.max(map.getZoom(), 15), { duration: 0.55 });
  }, [map, activeId, markers]);
  return null;
}

function FitMarkers({ markers }: { markers: SalonMapMarker[] }) {
  const map = useMap();
  const prevKey = useRef("");
  useEffect(() => {
    const key = markers.map((m) => m.id).join("|");
    if (key === prevKey.current) return;
    prevKey.current = key;
    if (markers.length === 0) {
      map.setView(TASHKENT, 12);
      return;
    }
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [72, 72], maxZoom: 14 });
  }, [map, markers]);
  return null;
}

function FlyToPoint({ point }: { point: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
    map.flyTo([point.lat, point.lng], 15, { duration: 0.55 });
  }, [map, point?.lat, point?.lng, point]);
  return null;
}

export function SalonMap({
  markers,
  activeId,
  onMarkerClick,
  userLocation,
  flyToUser,
  heatmap,
  onMapReady,
}: {
  markers: SalonMapMarker[];
  activeId: string | null;
  onMarkerClick: (id: string) => void;
  userLocation: { lat: number; lng: number } | null;
  flyToUser: { lat: number; lng: number } | null;
  heatmap: boolean;
  onMapReady?: (map: L.Map) => void;
}) {
  const initRef = useRef<[number, number]>(TASHKENT);

  return (
    <MapContainer
      center={initRef.current}
      zoom={12}
      zoomControl={false}
      attributionControl={false}
      style={{ width: "100%", height: "100%", background: "oklch(0.945 0.014 85)" }}
      ref={(instance) => {
        if (instance) onMapReady?.(instance);
      }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains={["a", "b", "c", "d"]}
        maxZoom={19}
      />
      <FitMarkers markers={markers} />
      <FlyToActive activeId={activeId} markers={markers} />
      <FlyToPoint point={flyToUser} />

      {heatmap &&
        markers.map((m) => (
          <Circle
            key={`heat-${m.id}`}
            center={[m.lat, m.lng]}
            radius={650}
            pathOptions={{
              color: "transparent",
              fillColor: "#141414",
              fillOpacity: 0.12,
            }}
          />
        ))}

      {userLocation && (
        <>
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={1200}
            pathOptions={{
              color: "#141414",
              weight: 1.5,
              fillColor: "#141414",
              fillOpacity: 0.06,
              dashArray: "5 8",
            }}
          />
        </>
      )}

      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={makePinIcon(activeId === m.id, m.kind)}
          eventHandlers={{ click: () => onMarkerClick(m.id) }}
        />
      ))}
    </MapContainer>
  );
}

export function fitMapToMarkers(map: L.Map, markers: SalonMapMarker[]) {
  if (markers.length === 0) {
    map.setView(TASHKENT, 12);
    return;
  }
  if (markers.length === 1) {
    map.setView([markers[0].lat, markers[0].lng], 14);
    return;
  }
  const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
  map.fitBounds(bounds, { padding: [72, 72], maxZoom: 14 });
}
