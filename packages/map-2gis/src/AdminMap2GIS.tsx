/// <reference path="../../../node_modules/@2gis/mapgl/global.d.ts" />

import { useEffect, useRef } from "react";
import { load } from "@2gis/mapgl";
import { getDgisApiKey } from "./api-key";
import { UZ_CENTER, toMapGlCoords } from "./constants";
import { buildAdminPinHtml, buildPopupHtml } from "./markers";
import type { AdminMapPoint } from "./types";

const SALON_SYMBOL = "M3 9.5L12 3l9 6.5V21H3V9.5z";
const BARBER_SYMBOL = "M14.7 6.3a1 1 0 010 1.4L9 13.4l-2.3-2.3a1 1 0 011.4-1.4L9 10.6l4.3-4.3a1 1 0 011.4 0z";

export type AdminMap2GISProps = {
  salons: AdminMapPoint[];
  barbers: AdminMapPoint[];
  className?: string;
  style?: React.CSSProperties;
};

export function AdminMap2GIS({ salons, barbers, className, style }: AdminMap2GISProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapgl.Map | null>(null);
  const mapglRef = useRef<typeof mapgl | null>(null);
  const markerRefs = useRef<mapgl.HtmlMarker[]>([]);

  const points = [...salons, ...barbers].filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng),
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let destroyed = false;
    let map: mapgl.Map | undefined;

    void load().then((mapglAPI) => {
      if (destroyed || !containerRef.current) return;
      mapglRef.current = mapglAPI;
      map = new mapglAPI.Map(containerRef.current, {
        center: toMapGlCoords(UZ_CENTER.lat, UZ_CENTER.lng),
        zoom: 6,
        key: getDgisApiKey(),
        zoomControl: true,
      });
      mapRef.current = map;
    });

    return () => {
      destroyed = true;
      markerRefs.current.forEach((m) => m.destroy());
      markerRefs.current = [];
      map?.destroy();
      mapRef.current = null;
      mapglRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const mapglAPI = mapglRef.current;
    if (!map || !mapglAPI) return;

    markerRefs.current.forEach((m) => m.destroy());
    markerRefs.current = [];

    const addPoint = (p: AdminMapPoint) => {
      const isSalon = p.kind === "salon";
      const pinHtml = buildAdminPinHtml(isSalon ? "#1a1a1a" : "#5C4A3A", isSalon ? SALON_SYMBOL : BARBER_SYMBOL);
      const marker = new mapglAPI.HtmlMarker(map, {
        coordinates: toMapGlCoords(p.lat, p.lng),
        html: pinHtml,
      });
      marker.on("click", () => {
        marker.setContent(
          buildPopupHtml(p.label, p.subtitle ?? "", isSalon ? "Salon" : "Sartarosh"),
        );
      });
      markerRefs.current.push(marker);
    };

    salons.forEach(addPoint);
    barbers.forEach(addPoint);

    if (points.length === 0) {
      map.setCenter(toMapGlCoords(UZ_CENTER.lat, UZ_CENTER.lng));
      map.setZoom(6);
      return;
    }
    if (points.length === 1) {
      map.setCenter(toMapGlCoords(points[0].lat, points[0].lng));
      map.setZoom(11);
      return;
    }
    const bounds = new mapglAPI.LngLatBounds();
    for (const p of points) bounds.extend(toMapGlCoords(p.lat, p.lng));
    map.fitBounds(bounds, { padding: 40, maxZoom: 12 });
  }, [salons, barbers, points]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
    />
  );
}
