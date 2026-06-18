/// <reference path="../../../node_modules/@2gis/mapgl/global.d.ts" />

import { useEffect, useId, useRef, useState } from "react";
import { load } from "@2gis/mapgl";
import { getDgisApiKey } from "./api-key";
import {
  DEFAULT_ZOOM,
  TASHKENT_CENTER,
  toMapGlCoords,
  USER_RADIUS_M,
} from "./constants";
import { buildPricePillHtml, buildUserDotHtml } from "./markers";
import { bindHtmlMarkerClick } from "./html-marker-events";
import { fitMapToPoints } from "./bounds";
import type { MapMarker } from "./types";

const BOTTOM_PAD = 168;

export type MapHandle = {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  fitMarkers: (markers: MapMarker[], padding?: { bottom?: number }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resize: () => void;
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
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const reactId = useId().replace(/:/g, "");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let destroyed = false;
    let map: mapgl.Map | undefined;

    void load()
      .then((mapglAPI) => {
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
        setMapReady(true);
        setMapError(null);

        const notifyResize = () => {
          window.dispatchEvent(new Event("resize"));
        };

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
            fitMapToPoints(
              map,
              mapglAPI,
              items.map((m) => toMapGlCoords(m.lat, m.lng)),
              {
                padding: {
                  top: 72,
                  right: 48,
                  bottom: padding?.bottom ?? BOTTOM_PAD,
                  left: 48,
                },
                maxZoom: 14,
              },
            );
          },
          zoomIn() {
            const next = Math.min((map?.getZoom() ?? DEFAULT_ZOOM) + 1, 18);
            map?.setZoom(next, { animate: true, duration: 280 });
          },
          zoomOut() {
            const next = Math.max((map?.getZoom() ?? DEFAULT_ZOOM) - 1, 10);
            map?.setZoom(next, { animate: true, duration: 280 });
          },
          resize: notifyResize,
        };
        onMapReady?.(handle);
      })
      .catch((err: unknown) => {
        console.error("[Map2GIS] failed to load mapgl", err);
        setMapError("Xarita yuklanmadi. Internet yoki 2GIS kalitini tekshiring.");
      });

    return () => {
      destroyed = true;
      setMapReady(false);
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
    if (!mapReady || !map || !mapglAPI) return;

    const nextIds = new Set(markers.map((m) => m.id));

    for (const [id, marker] of markerRefs.current) {
      if (!nextIds.has(id)) {
        marker.destroy();
        markerRefs.current.delete(id);
      }
    }

    for (const m of markers) {
      try {
        const pinLabel = m.priceLabel || m.label.slice(0, 8);
        const html = buildPricePillHtml(activeId === m.id, pinLabel);
        const existing = markerRefs.current.get(m.id);
        if (existing) {
          existing.setContent(html);
          existing.setCoordinates(toMapGlCoords(m.lat, m.lng));
          bindHtmlMarkerClick(existing, () => onMarkerClick?.(m.id));
        } else {
          const marker = new mapglAPI.HtmlMarker(map, {
            coordinates: toMapGlCoords(m.lat, m.lng),
            html,
            interactive: true,
            preventMapInteractions: true,
          });
          bindHtmlMarkerClick(marker, () => onMarkerClick?.(m.id));
          markerRefs.current.set(m.id, marker);
        }
      } catch (err) {
        console.error("[Map2GIS] marker sync failed", m.id, err);
      }
    }
  }, [markers, activeId, onMarkerClick, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const mapglAPI = mapglRef.current;
    if (!mapReady || !map || !mapglAPI) return;

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
      color: "#1414140D",
      strokeWidth: 1,
      strokeColor: "#14141433",
    });
  }, [showUserLocation, userLocation, mapReady]);

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
    if (!mapReady || !map || !mapglAPI) return;

    if (!markers.some((m) => m.id)) {
      map.setCenter(toMapGlCoords(TASHKENT_CENTER.lat, TASHKENT_CENTER.lng));
      map.setZoom(DEFAULT_ZOOM);
      return;
    }
    try {
      fitMapToPoints(
        map,
        mapglAPI,
        markers.map((m) => toMapGlCoords(m.lat, m.lng)),
        { padding: { top: 72, right: 48, bottom: BOTTOM_PAD, left: 48 }, maxZoom: 14 },
      );
    } catch (err) {
      console.error("[Map2GIS] fitBounds failed", err);
    }
  }, [markers, mapReady]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !mapReady) return;

    const onResize = () => window.dispatchEvent(new Event("resize"));
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapReady]);

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%", ...style }}>
      <div
        ref={containerRef}
        id={`map2gis-${reactId}`}
        style={{ width: "100%", height: "100%", background: "oklch(0.94 0.012 85)" }}
      />
      {mapError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/90 px-6 text-center text-sm text-muted-foreground">
          {mapError}
        </div>
      ) : null}
    </div>
  );
}
