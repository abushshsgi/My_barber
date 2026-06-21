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
import { buildPricePillHtml, buildSalonPreviewHtml, buildUserDotHtml } from "./markers";
import { bindHtmlMarkerClick, bindHtmlMarkerHover } from "./html-marker-events";
import { fitMapToPoints } from "./bounds";
import { readMapViewport, type MapViewport } from "./viewport";
import type { MapMarker } from "./types";

const BOTTOM_PAD = 168;
const DESKTOP_FIT_PAD = { top: 48, right: 72, bottom: 48, left: 48 };

export type MapHandle = {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  fitMarkers: (markers: MapMarker[], padding?: { bottom?: number }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resize: () => void;
  getViewport: () => MapViewport | null;
};

export type Map2GISProps = {
  markers: MapMarker[];
  activeId?: string | null;
  hoveredId?: string | null;
  onMarkerClick?: (id: string) => void;
  onMarkerHover?: (id: string | null) => void;
  onViewportChange?: (viewport: MapViewport) => void;
  showUserLocation?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  onMapReady?: (handle: MapHandle) => void;
  autoFitMarkers?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function Map2GIS({
  markers,
  activeId = null,
  hoveredId = null,
  onMarkerClick,
  onMarkerHover,
  onViewportChange,
  showUserLocation = false,
  userLocation = null,
  onMapReady,
  autoFitMarkers = true,
  className,
  style,
}: Map2GISProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapgl.Map | null>(null);
  const mapglRef = useRef<typeof mapgl | null>(null);
  const markerRefs = useRef<Map<string, mapgl.HtmlMarker>>(new Map());
  const previewRef = useRef<mapgl.HtmlMarker | null>(null);
  const userMarkerRef = useRef<mapgl.HtmlMarker | null>(null);
  const userCircleRef = useRef<mapgl.Circle | null>(null);
  const onMapReadyRef = useRef(onMapReady);
  const onViewportChangeRef = useRef(onViewportChange);
  const onMarkerHoverRef = useRef(onMarkerHover);
  const onMarkerClickRef = useRef(onMarkerClick);
  const hoveredIdRef = useRef<string | null>(null);
  const prevActiveIdRef = useRef<string | null>(null);
  const initialFitDoneRef = useRef(false);
  const skipViewportEmitRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const reactId = useId().replace(/:/g, "");

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    onMarkerHoverRef.current = onMarkerHover;
  }, [onMarkerHover]);

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  useEffect(() => {
    hoveredIdRef.current = hoveredId ?? null;
  }, [hoveredId]);

  const emitViewport = () => {
    const map = mapRef.current;
    if (!map || skipViewportEmitRef.current) return;
    const vp = readMapViewport(map);
    if (vp) onViewportChangeRef.current?.(vp);
  };

  const hidePreview = () => {
    previewRef.current?.destroy();
    previewRef.current = null;
  };

  const showPreview = (m: MapMarker) => {
    const map = mapRef.current;
    const mapglAPI = mapglRef.current;
    if (!map || !mapglAPI) return;

    hidePreview();
    const cover = m.coverUrl?.trim() || "";
    if (!cover) return;

    const html = buildSalonPreviewHtml(cover, m.label);
    const preview = new mapglAPI.HtmlMarker(map, {
      coordinates: toMapGlCoords(m.lat, m.lng),
      html,
      interactive: true,
      preventMapInteractions: true,
      zIndex: 20,
    });
    bindHtmlMarkerClick(preview, () => onMarkerClickRef.current?.(m.id));
    previewRef.current = preview;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let destroyed = false;
    let map: mapgl.Map | undefined;

    const notifyResize = () => {
      const m = mapRef.current as (mapgl.Map & { invalidateSize?: () => void }) | null;
      m?.invalidateSize?.();
      window.dispatchEvent(new Event("resize"));
      requestAnimationFrame(() => {
        m?.invalidateSize?.();
        window.dispatchEvent(new Event("resize"));
      });
    };

    const buildHandle = (): MapHandle => ({
      flyTo(lat, lng, zoom = 15) {
        const m = mapRef.current;
        if (!m) return;
        skipViewportEmitRef.current = true;
        m.setCenter(toMapGlCoords(lat, lng), { animate: true, duration: 550 });
        if (zoom && (m.getZoom() ?? 0) < zoom) {
          m.setZoom(zoom, { animate: true, duration: 550 });
        }
        window.setTimeout(() => {
          skipViewportEmitRef.current = false;
          emitViewport();
        }, 600);
      },
      fitMarkers(items, padding) {
        const m = mapRef.current;
        const api = mapglRef.current;
        if (!m || !api) return;
        skipViewportEmitRef.current = true;
        if (items.length === 0) {
          m.setCenter(toMapGlCoords(TASHKENT_CENTER.lat, TASHKENT_CENTER.lng));
          m.setZoom(DEFAULT_ZOOM);
        } else {
          fitMapToPoints(
            m,
            api,
            items.map((item) => toMapGlCoords(item.lat, item.lng)),
            {
              padding: {
                ...DESKTOP_FIT_PAD,
                bottom: padding?.bottom ?? DESKTOP_FIT_PAD.bottom,
              },
              maxZoom: 14,
            },
          );
        }
        notifyResize();
        window.setTimeout(() => {
          skipViewportEmitRef.current = false;
          emitViewport();
        }, 450);
      },
      zoomIn() {
        const m = mapRef.current;
        if (!m) return;
        const next = Math.min((m.getZoom() ?? DEFAULT_ZOOM) + 1, 18);
        m.setZoom(next, { animate: true, duration: 280 });
      },
      zoomOut() {
        const m = mapRef.current;
        if (!m) return;
        const next = Math.max((m.getZoom() ?? DEFAULT_ZOOM) - 1, 10);
        m.setZoom(next, { animate: true, duration: 280 });
      },
      resize: notifyResize,
      getViewport() {
        const m = mapRef.current;
        return m ? readMapViewport(m) : null;
      },
    });

    void load()
      .then((mapglAPI) => {
        if (destroyed || !containerRef.current) return;
        mapglRef.current = mapglAPI;
        map = new mapglAPI.Map(containerRef.current, {
          center: toMapGlCoords(TASHKENT_CENTER.lat, TASHKENT_CENTER.lng),
          zoom: DEFAULT_ZOOM,
          key: getDgisApiKey(),
          zoomControl: false,
          enableTrackResize: true,
          disableRotationByUserInteraction: true,
          disablePitchByUserInteraction: true,
        });
        mapRef.current = map;
        setMapReady(true);
        setMapError(null);
        onMapReadyRef.current?.(buildHandle());
        notifyResize();

        map.on("moveend", () => {
          if (!skipViewportEmitRef.current) emitViewport();
        });
      })
      .catch((err: unknown) => {
        console.error("[Map2GIS] failed to load mapgl", err);
        setMapError("Xarita yuklanmadi. Internet yoki 2GIS kalitini tekshiring.");
      });

    return () => {
      destroyed = true;
      setMapReady(false);
      hidePreview();
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
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const mapglAPI = mapglRef.current;
    if (!mapReady || !map || !mapglAPI) return;

    const nextIds = new Set(markers.map((m) => m.id));
    const hoverId = hoveredIdRef.current;

    for (const [id, marker] of markerRefs.current) {
      if (!nextIds.has(id)) {
        marker.destroy();
        markerRefs.current.delete(id);
      }
    }

    for (const m of markers) {
      try {
        const pinLabel = m.priceLabel || m.label.slice(0, 8);
        const isActive = activeId === m.id;
        const isHovered = hoverId === m.id;
        const html = buildPricePillHtml(isHovered || isActive, pinLabel, isHovered && !isActive);
        const existing = markerRefs.current.get(m.id);

        const bindMarker = (marker: mapgl.HtmlMarker) => {
          bindHtmlMarkerClick(marker, () => onMarkerClickRef.current?.(m.id));
          bindHtmlMarkerHover(
            marker,
            () => {
              onMarkerHoverRef.current?.(m.id);
              showPreview(m);
            },
            () => {
              onMarkerHoverRef.current?.(null);
              hidePreview();
            },
          );
        };

        if (existing) {
          existing.setContent(html);
          existing.setCoordinates(toMapGlCoords(m.lat, m.lng));
          bindMarker(existing);
        } else {
          const marker = new mapglAPI.HtmlMarker(map, {
            coordinates: toMapGlCoords(m.lat, m.lng),
            html,
            interactive: true,
            preventMapInteractions: true,
            zIndex: isActive ? 12 : 10,
          });
          bindMarker(marker);
          markerRefs.current.set(m.id, marker);
        }
      } catch (err) {
        console.error("[Map2GIS] marker sync failed", m.id, err);
      }
    }
  }, [markers, activeId, hoveredId, mapReady]);

  useEffect(() => {
    if (!hoveredId) {
      hidePreview();
      return;
    }
    const m = markers.find((x) => x.id === hoveredId);
    if (m?.coverUrl) showPreview(m);
  }, [hoveredId, markers]);

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
    if (prevActiveIdRef.current === null) {
      prevActiveIdRef.current = activeId;
    }
  }, [activeId]);

  useEffect(() => {
    if (!autoFitMarkers) return;
    const map = mapRef.current;
    const mapglAPI = mapglRef.current;
    if (!mapReady || !map || !mapglAPI) return;

    if (!markers.some((m) => m.id)) {
      map.setCenter(toMapGlCoords(TASHKENT_CENTER.lat, TASHKENT_CENTER.lng));
      map.setZoom(DEFAULT_ZOOM);
      initialFitDoneRef.current = false;
      return;
    }

    if (initialFitDoneRef.current) return;
    initialFitDoneRef.current = true;
    skipViewportEmitRef.current = true;
    fitMapToPoints(
      map,
      mapglAPI,
      markers.map((m) => toMapGlCoords(m.lat, m.lng)),
      { padding: { top: 72, right: 48, bottom: BOTTOM_PAD, left: 48 }, maxZoom: 14 },
    );
    window.setTimeout(() => {
      skipViewportEmitRef.current = false;
      emitViewport();
    }, 450);
  }, [markers, mapReady, autoFitMarkers]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !mapReady) return;

    const ro = new ResizeObserver(() => {
      const m = mapRef.current as (mapgl.Map & { invalidateSize?: () => void }) | null;
      m?.invalidateSize?.();
    });
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
