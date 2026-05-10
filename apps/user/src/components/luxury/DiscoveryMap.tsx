import { useEffect, useRef } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type DiscoveryMarkerItem = { id: string; lat: number; lng: number; label: string };

const userIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#0A0A0A;border:3px solid #ffffff;box-shadow:0 0 0 6px rgba(10,10,10,0.18), 0 2px 6px rgba(0,0,0,0.25);"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function makePinIcon(active: boolean) {
  const bg = active ? "#0A0A0A" : "#FFFFFF";
  const fg = active ? "#FFFFFF" : "#0A0A0A";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:34px;height:42px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.3));">
      <svg viewBox="0 0 34 42" width="34" height="42" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 41 C17 41 32 26 32 16 A15 15 0 1 0 2 16 C2 26 17 41 17 41 Z" fill="${bg}" stroke="#0A0A0A" stroke-width="1.5"/>
        <circle cx="17" cy="16" r="5.5" fill="${fg}"/>
      </svg>
    </div>`,
    iconSize: [34, 42],
    iconAnchor: [17, 41],
  });
}

function Recenter({
  center,
  activeId,
  markers,
}: {
  center: { lat: number; lng: number } | null;
  activeId: string | null;
  markers: DiscoveryMarkerItem[];
}) {
  const map = useMap();
  useEffect(() => {
    if (activeId) {
      const m = markers.find((x) => x.id === activeId);
      if (m) map.flyTo([m.lat, m.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
    }
  }, [map, activeId, markers]);
  useEffect(() => {
    if (center && !activeId)
      map.flyTo([center.lat, center.lng], map.getZoom(), { duration: 0.6 });
  }, [map, center, activeId]);
  return null;
}

export function DiscoveryMap({
  center,
  markers,
  activeId,
  onMarkerClick,
  radiusKm,
}: {
  center: { lat: number; lng: number } | null;
  markers: DiscoveryMarkerItem[];
  activeId: string | null;
  onMarkerClick: (id: string) => void;
  radiusKm: number;
}) {
  const fallback = center ?? { lat: 41.3111, lng: 69.2797 };
  const zoom = radiusKm === 1 ? 15 : radiusKm === 2 ? 14 : 13;
  const initRef = useRef<[number, number]>([fallback.lat, fallback.lng]);

  return (
    <MapContainer
      center={initRef.current}
      zoom={zoom}
      zoomControl={false}
      attributionControl={false}
      style={{ width: "100%", height: "100%", background: "var(--color-muted)" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains={["a", "b", "c", "d"]}
        maxZoom={19}
      />
      <Recenter center={center} activeId={activeId} markers={markers} />
      {center ? (
        <>
          <Marker position={[center.lat, center.lng]} icon={userIcon} />
          <Circle
            center={[center.lat, center.lng]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: "#0A0A0A",
              weight: 1.5,
              fillColor: "#0A0A0A",
              fillOpacity: 0.05,
              dashArray: "4 6",
            }}
          />
        </>
      ) : null}
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={makePinIcon(activeId === m.id)}
          eventHandlers={{ click: () => onMarkerClick(m.id) }}
        />
      ))}
    </MapContainer>
  );
}
