"use client";

import { useCallback, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

function ClickPick({
  onPick,
  enabled,
}: {
  onPick: (lat: number, lng: number) => void;
  enabled: boolean;
}) {
  useMapEvents({
    click(e) {
      if (enabled) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

type Props = {
  latitude: number;
  longitude: number;
  onChange?: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
};

/**
 * Salon joylashuvini xaritada ko‘rsatish; onChange berilsa — marker sudraladi va xaritaga bosiladi.
 */
export default function SalonPinMap({
  latitude,
  longitude,
  onChange,
  height = "200px",
  className = "",
}: Props) {
  const center = useMemo((): [number, number] => {
    const la = Number.isFinite(latitude) ? latitude : 41.3111;
    const ln = Number.isFinite(longitude) ? longitude : 69.2797;
    return [la, ln];
  }, [latitude, longitude]);

  const onDragEnd = useCallback(
    (e: L.LeafletEvent) => {
      const m = e.target as L.Marker;
      const p = m.getLatLng();
      onChange?.(p.lat, p.lng);
    },
    [onChange]
  );

  const interactive = !!onChange;

  return (
    <div className={`rounded-xl overflow-hidden border border-border/80 ${className}`} style={{ height }}>
      <MapContainer
        center={center}
        zoom={interactive ? 16 : 15}
        className="h-full w-full z-0"
        scrollWheelZoom={interactive}
        dragging={true}
        doubleClickZoom={interactive}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={center} zoom={interactive ? 16 : 15} />
        <Marker
          position={center}
          draggable={interactive}
          eventHandlers={interactive ? { dragend: onDragEnd } : undefined}
        />
        {interactive ? <ClickPick enabled onPick={(la, ln) => onChange(la, ln)} /> : null}
      </MapContainer>
    </div>
  );
}
