import { useEffect, useRef, useState } from "react";
import "./google-maps-types";
import { resolveGoogleMapsApiKey } from "./api-key";
import { UZ_CENTER } from "./constants";
import { buildAdminPinHtml, buildPopupHtml } from "./markers";
import { bindHtmlMarkerClick } from "./html-marker-events";
import { createHtmlOverlay, type HtmlOverlay } from "./html-overlay";
import { fitMapToPoints } from "./bounds";
import { loadGoogleMaps } from "./load-maps";
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
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<HtmlOverlay[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const points = [...salons, ...barbers].filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng),
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let destroyed = false;

    void (async () => {
      const apiKey = await resolveGoogleMapsApiKey();
      if (destroyed || !containerRef.current || !apiKey) return;

      try {
        await loadGoogleMaps(apiKey);
        if (destroyed || !containerRef.current) return;
        const map = new google.maps.Map(containerRef.current, {
          center: UZ_CENTER,
          zoom: 6,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
          clickableIcons: false,
        });
        mapRef.current = map;
        setMapReady(true);
      } catch (err) {
        console.error("[AdminMap2GIS] failed to load Google Maps", err);
      }
    })();

    return () => {
      destroyed = true;
      setMapReady(false);
      markerRefs.current.forEach((m) => m.destroy());
      markerRefs.current = [];
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    markerRefs.current.forEach((m) => m.destroy());
    markerRefs.current = [];

    const addPoint = (p: AdminMapPoint) => {
      const isSalon = p.kind === "salon";
      const pinHtml = buildAdminPinHtml(isSalon ? "#1a1a1a" : "#5C4A3A", isSalon ? SALON_SYMBOL : BARBER_SYMBOL);
      const marker = createHtmlOverlay(map, { lat: p.lat, lng: p.lng }, pinHtml);
      bindHtmlMarkerClick(marker, () => {
        marker.setContent(
          buildPopupHtml(p.label, p.subtitle ?? "", isSalon ? "Salon" : "Sartarosh"),
        );
      });
      markerRefs.current.push(marker);
    };

    salons.forEach(addPoint);
    barbers.forEach(addPoint);

    if (points.length === 0) {
      map.setCenter(UZ_CENTER);
      map.setZoom(6);
      return;
    }
    if (points.length === 1) {
      map.setCenter({ lat: points[0].lat, lng: points[0].lng });
      map.setZoom(11);
      return;
    }
    try {
      fitMapToPoints(
        map,
        points.map((p) => ({ lat: p.lat, lng: p.lng })),
        { padding: 40, maxZoom: 12 },
      );
    } catch (err) {
      console.error("[AdminMap2GIS] fitBounds failed", err);
    }
  }, [salons, barbers, points, mapReady]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
    />
  );
}
