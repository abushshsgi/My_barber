"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Link } from "@/navigation";
import { StarRating } from "@/components/StarRating";
import "leaflet/dist/leaflet.css";
import type { Salon } from "@/types";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export type SalonOnMap = Salon & { distance: number };

export type BarberOnMap = {
  profileId: number;
  barberId: number;
  name: string;
  lat: number;
  lng: number;
  distance: number;
  avatarUrl: string;
};

const ACCENT_LINE = "hsl(172 58% 52%)";
const ACCENT_FILL = "hsl(172 55% 48%)";

function escapeAttr(url: string): string {
  return url.replace(/"/g, "&quot;");
}

function salonDivIcon(coverUrl: string): L.DivIcon {
  const safe = escapeAttr(coverUrl);
  const w = 58;
  const h = 58;
  const a = w / 2;
  return L.divIcon({
    className: "leaflet-div-icon-transparent",
    html: `<div style="width:${w}px;height:${h}px;border-radius:9999px;background-image:url('${safe}');background-size:cover;background-position:center;border:3px solid #fff;box-shadow:0 6px 20px rgba(0,0,0,0.35),0 0 0 3px hsl(172 58% 45% / 0.85)"></div>`,
    iconSize: [w, h],
    iconAnchor: [a, h],
    popupAnchor: [0, -h + 6],
  });
}

function barberDivIcon(avatarUrl: string): L.DivIcon {
  const safe = escapeAttr(avatarUrl);
  const w = 54;
  const h = 54;
  const a = w / 2;
  return L.divIcon({
    className: "leaflet-div-icon-transparent",
    html: `<div style="width:${w}px;height:${h}px;border-radius:9999px;background-image:url('${safe}');background-size:cover;background-position:center;border:3px solid #fff;box-shadow:0 6px 20px rgba(0,0,0,0.35),0 0 0 3px hsl(38 92% 52% / 0.9)"></div>`,
    iconSize: [w, h],
    iconAnchor: [a, h],
    popupAnchor: [0, -h + 6],
  });
}

/** «Men» tugmasi — flyTo */
function FlyToUser({
  position,
  zoom,
  trigger,
}: {
  position: [number, number];
  zoom: number;
  trigger: number;
}) {
  const map = useMap();
  const lat = position[0];
  const lng = position[1];
  useEffect(() => {
    if (trigger > 0) {
      map.flyTo([lat, lng], zoom, { duration: 1.1 });
    }
  }, [trigger, lat, lng, zoom, map]);
  return null;
}

export default function MapInner({
  center,
  userPosition,
  radiusKm,
  salons,
  barbers,
  onSelectSalon,
  onSelectBarber,
  flyToMeTrigger,
  mapZoom,
}: {
  center: [number, number];
  userPosition: [number, number];
  radiusKm: number;
  salons: SalonOnMap[];
  barbers: BarberOnMap[];
  onSelectSalon: (id: string | null) => void;
  onSelectBarber: (barberId: number | null) => void;
  flyToMeTrigger: number;
  mapZoom: number;
}) {
  const salonIcons = useMemo(() => {
    const m = new Map<string, L.DivIcon>();
    salons.forEach((s) => {
      m.set(s.id, salonDivIcon(s.coverImage));
    });
    return m;
  }, [salons]);

  const barberIcons = useMemo(() => {
    const m = new Map<number, L.DivIcon>();
    barbers.forEach((b) => {
      m.set(b.barberId, barberDivIcon(b.avatarUrl));
    });
    return m;
  }, [barbers]);

  return (
    <>
      <MapContainer
        center={center}
        zoom={mapZoom}
        className="h-full min-h-[200px] w-full z-0 rounded-xl border-0 shadow-inner bg-muted/30 [&_.leaflet-control-zoom]:scale-90 [&_.leaflet-control-zoom]:origin-top-right [&_.leaflet-control-zoom]:mr-1 [&_.leaflet-control-zoom]:mt-1"
        zoomControl
        scrollWheelZoom
      >
        <FlyToUser position={userPosition} zoom={mapZoom} trigger={flyToMeTrigger} />
        {/* CARTO: OSM subdomain so‘rovlari ba’zi brauzerlarda bekor qilinadi (NS_BINDING_ABORTED) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          subdomains="abcd"
          maxZoom={20}
          maxNativeZoom={20}
        />

        <Circle
          center={userPosition}
          radius={radiusKm * 1000}
          pathOptions={{
            color: ACCENT_LINE,
            fillColor: ACCENT_FILL,
            fillOpacity: 0.14,
            weight: 2.5,
            dashArray: "10 12",
            lineCap: "round",
            lineJoin: "round",
          }}
        />

        <CircleMarker
          center={userPosition}
          radius={11}
          pathOptions={{
            color: "#ffffff",
            fillColor: "#3b82f6",
            fillOpacity: 1,
            weight: 3,
            opacity: 1,
          }}
        >
          <Popup className="map-popup-user" minWidth={160}>
            <span className="text-sm font-semibold">Siz bu yerdasiz</span>
            <p className="text-[11px] text-muted-foreground mt-1">Radius ichidagi salon va barberlar shu doirada</p>
          </Popup>
        </CircleMarker>

        {salons.map((salon) => {
          const icon = salonIcons.get(salon.id) ?? salonDivIcon(salon.coverImage);
          return (
            <Marker
              key={`salon-${salon.id}`}
              position={[salon.lat, salon.lng]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  onSelectBarber(null);
                  onSelectSalon(salon.id);
                },
              }}
            >
              <Popup className="map-popup-card" minWidth={220} maxWidth={280}>
                <Link href={`/salon/${salon.id}`} className="block">
                  <div className="rounded-xl overflow-hidden border border-teal-500/25 shadow-sm mb-2">
                    <img
                      src={salon.coverImage}
                      alt={salon.name}
                      className="w-full h-28 object-cover"
                    />
                  </div>
                  <h3 className="font-bold text-sm leading-tight">{salon.name}</h3>
                  <p className="text-[10px] font-medium text-teal-600 dark:text-teal-400 mt-0.5">Salon</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <StarRating rating={salon.rating} size="sm" />
                    <span className="text-xs text-muted-foreground font-medium">
                      {salon.distance.toFixed(1)} km
                    </span>
                  </div>
                </Link>
              </Popup>
            </Marker>
          );
        })}

        {barbers.map((b) => {
          const icon = barberIcons.get(b.barberId) ?? barberDivIcon(b.avatarUrl);
          return (
            <Marker
              key={`barber-${b.barberId}`}
              position={[b.lat, b.lng]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  onSelectSalon(null);
                  onSelectBarber(b.barberId);
                },
              }}
            >
              <Popup className="map-popup-card" minWidth={220} maxWidth={280}>
                <Link href={`/booking/barber/${b.barberId}`} className="block">
                  <div className="rounded-xl overflow-hidden border-2 border-amber-500/40 shadow-sm mb-2">
                    <img
                      src={b.avatarUrl}
                      alt={b.name}
                      className="w-full h-28 object-cover"
                    />
                  </div>
                  <h3 className="font-bold text-sm leading-tight">{b.name}</h3>
                  <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 mt-0.5">
                    Mustaqil barber
                  </p>
                  <span className="text-xs text-muted-foreground font-medium mt-1 inline-block">
                    {b.distance.toFixed(1)} km
                  </span>
                </Link>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </>
  );
}
