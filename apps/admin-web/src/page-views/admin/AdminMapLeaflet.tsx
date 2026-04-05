"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON as GeoJSONLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { AdminBarberRow, AdminSalonRow } from "@/lib/admin-api";
import { uzRegionLabel } from "@/lib/uz-regions";
import { GEO_ADM1_TO_REGION, geoMatchesFilter } from "@/lib/uz-geo-map";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const salonMapIcon = L.divIcon({
  className: "leaflet-div-icon-transparent",
  html: `<div style="width:30px;height:30px;border-radius:50%;background:#059669;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.35)"></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const barberMapIcon = L.divIcon({
  className: "leaflet-div-icon-transparent",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#7c3aed;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.35)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const UZ_CENTER: [number, number] = [41.31, 69.28];
const DEFAULT_ZOOM = 6;

type GeoFeat = GeoJSON.Feature & {
  properties?: { ADM1_EN?: string; regionCode?: string; [k: string]: unknown };
};

function parseCoord(latStr: string | undefined, lngStr: string | undefined): [number, number] | null {
  const lat = parseFloat(latStr ?? "");
  const lng = parseFloat(lngStr ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

function MapFit({
  markerPoints,
  regionFilter,
  geoCollection,
}: {
  markerPoints: [number, number][];
  regionFilter: string;
  geoCollection: GeoJSON.FeatureCollection | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (regionFilter && geoCollection?.features?.length) {
      const feats = geoCollection.features.filter((f) => {
        const code = (f as GeoFeat).properties?.regionCode ?? "";
        return geoMatchesFilter(code, regionFilter);
      });
      if (feats.length) {
        const layer = L.geoJSON(feats as unknown as GeoJSON.GeoJsonObject);
        const b = layer.getBounds();
        if (b.isValid()) {
          map.fitBounds(b, { padding: [56, 56], maxZoom: 10 });
          return;
        }
      }
    }

    if (markerPoints.length === 0) {
      map.setView(UZ_CENTER, DEFAULT_ZOOM);
      return;
    }
    if (markerPoints.length === 1) {
      map.setView(markerPoints[0], 11);
      return;
    }
    const b = L.latLngBounds(markerPoints);
    map.fitBounds(b, { padding: [48, 48], maxZoom: 12 });
  }, [map, markerPoints, regionFilter, geoCollection]);

  return null;
}

type Props = {
  salons: AdminSalonRow[];
  barbers: AdminBarberRow[];
  regionFilter: string;
};

export default function AdminMapLeaflet({ salons, barbers, regionFilter }: Props) {
  const [geoCollection, setGeoCollection] = useState<GeoJSON.FeatureCollection | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/geo/uzbekistan_viloyats.geojson");
        if (!res.ok) throw new Error(String(res.status));
        const raw = (await res.json()) as GeoJSON.FeatureCollection;
        if (cancelled) return;
        const features = (raw.features || []).map((f) => {
          const feat = f as GeoFeat;
          const en = feat.properties?.ADM1_EN;
          const regionCode = en ? GEO_ADM1_TO_REGION[en] ?? "" : "";
          return {
            ...feat,
            properties: { ...feat.properties, regionCode },
          };
        });
        setGeoCollection({ type: "FeatureCollection", features });
      } catch {
        if (!cancelled) setGeoError("Chegara fayli yuklanmadi");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const boundaryStyle = useCallback(
    (feature?: GeoJSON.Feature) => {
      const code = (feature as GeoFeat | undefined)?.properties?.regionCode ?? "";
      const selected = regionFilter;
      const match = geoMatchesFilter(code, selected);
      const dim = selected && !match;
      return {
        color: dim ? "hsl(220 14% 38%)" : "hsl(262 83% 58%)",
        weight: dim ? 0.6 : 1.8,
        opacity: dim ? 0.45 : 0.95,
        fillColor: "hsl(262 70% 50%)",
        fillOpacity: dim ? 0.03 : 0.1,
      };
    },
    [regionFilter],
  );

  const points = useMemo(() => {
    const out: [number, number][] = [];
    for (const s of salons) {
      const p = parseCoord(s.latitude, s.longitude);
      if (p) out.push(p);
    }
    for (const b of barbers) {
      const p = parseCoord(b.latitude, b.longitude);
      if (p) out.push(p);
    }
    return out;
  }, [salons, barbers]);

  const barbersOnMap = useMemo(
    () => barbers.filter((b) => parseCoord(b.latitude, b.longitude) !== null),
    [barbers],
  );

  return (
    <div className="relative h-full min-h-[420px] w-full">
      {geoError && (
        <p className="absolute left-2 top-2 z-[500] rounded-md bg-destructive/90 px-2 py-1 text-xs text-destructive-foreground">
          {geoError}
        </p>
      )}
      <MapContainer
        center={UZ_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full min-h-[420px] w-full rounded-xl"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoCollection && (
          <GeoJSONLayer data={geoCollection} style={boundaryStyle as L.StyleFunction} />
        )}
        <MapFit
          markerPoints={points}
          regionFilter={regionFilter}
          geoCollection={geoCollection}
        />
        {salons.map((s) => {
          const pos = parseCoord(s.latitude, s.longitude);
          if (!pos) return null;
          const vil = s.region_label || uzRegionLabel(s.region);
          return (
            <Marker key={`salon-${s.id}`} position={pos} icon={salonMapIcon}>
              <Popup>
                <div className="max-w-[220px]">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    Salon
                  </div>
                  <div className="font-semibold text-foreground">{s.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{vil || "Viloyat —"}</div>
                  {s.address ? (
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.address}</div>
                  ) : null}
                  <div className="mt-1 text-xs">
                    {s.is_published ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Chop etilgan</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">Kutilmoqda</span>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        {barbersOnMap.map((b) => {
          const pos = parseCoord(b.latitude, b.longitude)!;
          const vil = b.region_label || uzRegionLabel(b.region);
          return (
            <Marker key={`barber-${b.id}`} position={pos} icon={barberMapIcon}>
              <Popup>
                <div className="max-w-[220px]">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-violet-500 dark:text-violet-400">
                    Sartarosh
                  </div>
                  <div className="font-semibold text-foreground">{b.full_name || b.email}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{b.email}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{vil || "Viloyat —"}</div>
                  <div className="mt-1 text-xs">
                    {b.is_active ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Faol</span>
                    ) : (
                      <span className="text-muted-foreground">Nofaol</span>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
