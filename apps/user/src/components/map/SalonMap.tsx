import { useEffect, useRef } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type SalonMapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  priceLabel?: string;
};

const TASHKENT: [number, number] = [41.3111, 69.2797];
const BOTTOM_PAD = 168;

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Airbnb-style narx pill pin. */
function makePricePinIcon(active: boolean, priceLabel: string) {
  const text = escapeHtmlAttr(priceLabel);
  const bg = active ? "#141414" : "#faf8f5";
  const color = active ? "#faf8f5" : "#141414";
  const border = active ? "2px solid #141414" : "1px solid rgba(20,20,20,0.12)";
  const shadow = active
    ? "0 4px 14px rgba(0,0,0,0.28)"
    : "0 2px 8px rgba(0,0,0,0.14)";
  const scale = active ? 1.08 : 1;

  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-50%);">
      <div style="
        padding:6px 11px;border-radius:9999px;background:${bg};color:${color};
        border:${border};box-shadow:${shadow};
        font-size:12px;font-weight:800;line-height:1;white-space:nowrap;
        transform:scale(${scale});transition:transform 0.15s ease;
        font-family:system-ui,-apple-system,sans-serif;
      ">${text}</div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

const userIcon = L.divIcon({
  className: "",
  html: `<span style="
    display:block;width:14px;height:14px;border-radius:9999px;
    background:#141414;border:3px solid #faf8f5;
    box-shadow:0 0 0 8px rgba(20,20,20,0.12);
  "></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
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
    map.fitBounds(bounds, {
      paddingTopLeft: [48, 72],
      paddingBottomRight: [48, BOTTOM_PAD],
      maxZoom: 14,
    });
  }, [map, markers]);
  return null;
}

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
  onMapReady?: (map: L.Map) => void;
}) {
  const initRef = useRef<[number, number]>(TASHKENT);

  return (
    <MapContainer
      center={initRef.current}
      zoom={12}
      zoomControl={false}
      attributionControl={false}
      style={{ width: "100%", height: "100%", background: "oklch(0.94 0.012 85)" }}
      ref={(instance) => {
        if (instance) onMapReady?.(instance);
      }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
        subdomains={["a", "b", "c", "d"]}
        maxZoom={20}
      />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
        subdomains={["a", "b", "c", "d"]}
        maxZoom={20}
      />
      <FitMarkers markers={markers} />
      <FlyToActive activeId={activeId} markers={markers} />

      {showUserLocation && userLocation ? (
        <>
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={900}
            pathOptions={{
              color: "#141414",
              weight: 1,
              fillColor: "#141414",
              fillOpacity: 0.05,
              dashArray: "4 6",
            }}
          />
        </>
      )}

      {markers.map((m) => {
        const pinLabel = m.priceLabel || m.label.slice(0, 8);
        return (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={makePricePinIcon(activeId === m.id, pinLabel)}
            eventHandlers={{ click: () => onMarkerClick(m.id) }}
          />
        );
      })}
    </MapContainer>
  );
}
