/// <reference path="../../../node_modules/@2gis/mapgl/global.d.ts" />

import { useEffect, useId, useRef } from "react";
import { load } from "@2gis/mapgl";
import { getDgisApiKey } from "./api-key";
import {
  DEFAULT_ZOOM,
  TASHKENT_CENTER,
  toMapGlCoords,
  USER_RADIUS_M,
} from "./constants";
import { buildPricePillHtml, buildUserDotHtml } from "./markers";
import type { MapMarker } from "./types";

const BOTTOM_PAD = 168;

type MapHandle = {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  fitMarkers: (markers: MapMarker[], padding?: { bottom?: number }) => void;
};

export type Map2GISProps = {
  markers: MapMarker[];
  activeId?: string | null;
  onMarkerClick?: (id: string) => void;
  showUserLocation?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  onMapReady?: (handle: MapHandle) => void;
  className?: string;
  style?: React.CSSProperties;
};

export function Map2GIS({
  markers,
  activeId = null,
  onMarkerClick,
  showUserLocation = false,
  userLocation = null,
  onMapReady,
  className,
  style,
}: Map2GISProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapgl.Map | null>(null);
  const mapglRef = useRef<typeof mapgl | null>(null);
  const markerRefs = useRef<Map<string, mapgl.HtmlMarker>>(new Map());
  const userMarkerRef = useRef<mapgl.HtmlMarker | null>(null);
  const userCircleRef = useRef<mapgl.Circle | null>(null);
  const readyRef = useRef(false);
  const reactId = useId().replace(/:/g, "");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let destroyed = false;
    let map: mapgl.Map | undefined;

    void load().then((mapglAPI) => {
      if (destroyed || !containerRef.current) return;
      mapglRef.current = mapglAPI;
      map = new mapglAPI.Map(containerRef.current, {
        center: toMapGlCoords(TASHKENT_CENTER.lat, TASHKENT_CENTER.lng),
        zoom: DEFAULT_ZOOM,
        key: getDgisApiKey(),
        zoomControl: false,
        disableRotationByUserInteraction: true,
        disablePitchByUserInteraction: true,
      });
      mapRef.current = map;
      readyRef.current = true;

      const handle: MapHandle = {
        flyTo(lat, lng, zoom = 15) {
          map?.setCenter(toMapGlCoords(lat, lng), { animate: true, duration: 550 });
          if (zoom && (map?.getZoom() ?? 0) < zoom) {
            map?.setZoom(zoom, { animate: true, duration: 550 });
          }
        },
        fitMarkers(items, padding) {
          if (!map || items.length === 0) {
            map?.setCenter(toMapGlCoords(TASHKENT_CENTER.lat, TASHKENT_CENTER.lng));
            map?.setZoom(DEFAULT_ZOOM);
            return;
          }
          if (items.length === 1) {
            map.setCenter(toMapGlCoords(items[0].lat, items[0].lng));
            map.setZoom(14);
            return;
          }
          const bounds = new mapglAPI.LngLatBounds();
          for (const m of items) bounds.extend(toMapGlCoords(m.lat, m.lng));
          map.fitBounds(bounds, {
            padding: {
              top: 72,
              right: 48,
              bottom: padding?.bottom ?? BOTTOM_PAD,
              left: 48,
            },
            maxZoom: 14,
          });
        },
      };
      onMapReady?.(handle);
    });

    return () => {
      destroyed = true;
      readyRef.current = false;
      markerRefs.current.forEach((m) => m.destroy());
      markerRefs.current.clear();
      userMarkerRef.current?.destroy();
      userMarkerRef.current = null;
      userCircleRef.current?.destroy();
      userCircleRef.current = null;
      map?.destroy();
      mapRef.current = null;
      mapglRef.current = null;
    };
  }, [onMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const mapglAPI = mapglRef.current;
    if (!map || !mapglAPI || !readyRef.current) return;

    const nextIds = new Set(markers.map((m) => m.id));

    for (const [id, marker] of markerRefs.current) {
      if (!nextIds.has(id)) {
        marker.destroy();
        markerRefs.current.delete(id);
      }
    }

    for (const m of markers) {
      const pinLabel = m.priceLabel || m.label.slice(0, 8);
      const html = buildPricePillHtml(activeId === m.id, pinLabel);
      const existing = markerRefs.current.get(m.id);
      if (existing) {
        existing.setContent(html);
        existing.setCoordinates(toMapGlCoords(m.lat, m.lng));
      } else {
        const marker = new mapglAPI.HtmlMarker(map, {
          coordinates: toMapGlCoords(m.lat, m.lng),
          html,
        });
        marker.on("click", () => onMarkerClick?.(m.id));
        markerRefs.current.set(m.id, marker);
      }
    }
  }, [markers, activeId, onMarkerClick]);

  useEffect(() => {
    const map = mapRef.current;
    const mapglAPI = mapglRef.current;
    if (!map || !mapglAPI || !readyRef.current) return;

    userMarkerRef.current?.destroy();
    userMarkerRef.current = null;
    userCircleRef.current?.destroy();
    userCircleRef.current = null;

    if (!showUserLocation || !userLocation) return;

    userMarkerRef.current = new mapglAPI.HtmlMarker(map, {
      coordinates: toMapGlCoords(userLocation.lat, userLocation.lng),
      html: buildUserDotHtml(),
    });
    userCircleRef.current = new mapglAPI.Circle(map, {
      coordinates: toMapGlCoords(userLocation.lat, userLocation.lng),
      radius: USER_RADIUS_M,
      color: "#141414",
      strokeWidth: 1,
      strokeColor: "#141414",
      strokeDashArray: [4, 6],
      opacity: 0.05,
    });
  }, [showUserLocation, userLocation]);

  useEffect(() => {
    if (!activeId || !mapRef.current) return;
    const m = markers.find((x) => x.id === activeId);
    if (!m) return;
    mapRef.current.setCenter(toMapGlCoords(m.lat, m.lng), { animate: true, duration: 550 });
    if ((mapRef.current.getZoom() ?? 0) < 15) {
      mapRef.current.setZoom(15, { animate: true, duration: 550 });
    }
  }, [activeId, markers]);

  useEffect(() => {
    const map = mapRef.current;
    const mapglAPI = mapglRef.current;
    if (!map || !mapglAPI || !readyRef.current) return;

    const key = markers.map((m) => m.id).join("|");
    if (!key) {
      map.setCenter(toMapGlCoords(TASHKENT_CENTER.lat, TASHKENT_CENTER.lng));
      map.setZoom(DEFAULT_ZOOM);
      return;
    }
    if (markers.length === 1) {
      map.setCenter(toMapGlCoords(markers[0].lat, markers[0].lng));
      map.setZoom(14);
      return;
    }
    const bounds = new mapglAPI.LngLatBounds();
    for (const m of markers) bounds.extend(toMapGlCoords(m.lat, m.lng));
    map.fitBounds(bounds, {
      padding: { top: 72, right: 48, bottom: BOTTOM_PAD, left: 48 },
      maxZoom: 14,
    });
  }, [markers]);

  return (
    <div
      ref={containerRef}
      id={`map2gis-${reactId}`}
      className={className}
      style={{ width: "100%", height: "100%", background: "oklch(0.94 0.012 85)", ...style }}
    />
  );
}
