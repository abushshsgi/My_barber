import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { AdminBarber, AdminSalon } from "@/lib/admin-api";

// Inline SVG icons (qora aksent, bejeviy fonga mos)
function makeIcon(color: string, kind: "salon" | "barber"): L.DivIcon {
  const symbol =
    kind === "salon"
      ? "M3 9.5L12 3l9 6.5V21H3V9.5z"
      : "M14.7 6.3a1 1 0 010 1.4L9 13.4l-2.3-2.3a1 1 0 011.4-1.4L9 10.6l4.3-4.3a1 1 0 011.4 0z";
  const html = `
    <div style="
      width: 32px; height: 32px; border-radius: 50%;
      background: ${color}; color: #F7F6F3;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      border: 2px solid #F7F6F3;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="${symbol}" />
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

const SALON_ICON = makeIcon("#1a1a1a", "salon");
const BARBER_ICON = makeIcon("#5C4A3A", "barber");

const UZ_CENTER: [number, number] = [41.3, 64.5];
const DEFAULT_ZOOM = 6;

function MapFit({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) {
      map.setView(UZ_CENTER, DEFAULT_ZOOM);
    } else if (points.length === 1) {
      map.setView(points[0], 11);
    } else {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [map, points]);
  return null;
}

export default function AdminMapLeaflet({
  salons,
  barbers,
}: {
  salons: AdminSalon[];
  barbers: AdminBarber[];
}) {
  const salonPoints = salons
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
    .map((s) => ({ ...s, point: [s.lat, s.lng] as [number, number] }));

  const barberPoints = barbers
    .filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lng))
    .map((b) => ({ ...b, point: [b.lat, b.lng] as [number, number] }));

  const allPoints: Array<[number, number]> = [
    ...salonPoints.map((p) => p.point),
    ...barberPoints.map((p) => p.point),
  ];

  return (
    <MapContainer
      center={UZ_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <MapFit points={allPoints} />

      {salonPoints.map((s) => (
        <Marker key={`s-${s.id}`} position={s.point} icon={SALON_ICON}>
          <Popup>
            <div style={{ fontFamily: "Manrope, sans-serif", minWidth: "180px" }}>
              <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>{s.name}</div>
              <div style={{ fontSize: "12px", color: "#666" }}>{s.address}</div>
              <div style={{ fontSize: "12px", marginTop: "6px" }}>
                ⭐ {s.rating.toFixed(1)} · {s.barbers_count} sartarosh
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {barberPoints.map((b) => (
        <Marker key={`b-${b.id}`} position={b.point} icon={BARBER_ICON}>
          <Popup>
            <div style={{ fontFamily: "Manrope, sans-serif", minWidth: "180px" }}>
              <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>{b.name}</div>
              <div style={{ fontSize: "12px", color: "#666" }}>{b.salon_name ?? "Mustaqil"}</div>
              <div style={{ fontSize: "12px", marginTop: "6px" }}>
                ⭐ {b.rating.toFixed(1)} ({b.reviews_count})
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
