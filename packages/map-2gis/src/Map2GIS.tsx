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
import { bindHtmlMarkerClick, bindHtmlMarkerHover, bindSalonPreviewNavigate } from "./html-marker-events";
import { fitMapToPoints } from "./bounds";
import { readMapViewport, type MapViewport } from "./viewport";
import type { MapMarker } from "./types";

const MARKER_EXIT_MS = 280;
const MARKER_STYLES_ID = "map2gis-marker-keyframes";

function ensureMarkerStyles() {
  if (typeof document === "undefined" || document.getElementById(MARKER_STYLES_ID)) return;
  const style = document.createElement("style");
  style.id = MARKER_STYLES_ID;
  style.textContent = `
    @keyframes map-marker-pop-in {
      0% { opacity: 0; transform: scale(0.45); }
      70% { opacity: 1; transform: scale(1.08); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes map-marker-pop-out {
      0% { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(0.45); }
    }
    .map-marker-pill-enter {
      animation: map-marker-pop-in 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    .map-marker-pill-exit {
      animation: map-marker-pop-out 0.28s ease-in both;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}
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
  selectedId?: string | null;
  hoveredId?: string | null;
  onMarkerSelect?: (id: string | null) => void;
  onMarkerNavigate?: (id: string) => void;
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
  selectedId = null,
  hoveredId = null,
  onMarkerSelect,
  onMarkerNavigate,
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
  const markerDataRef = useRef<Map<string, MapMarker>>(new Map());
  const exitingIdsRef = useRef<Set<string>>(new Set());
  const exitTimersRef = useRef<Map<string, number>>(new Map());
  const previewRef = useRef<mapgl.HtmlMarker | null>(null);
  const userMarkerRef = useRef<mapgl.HtmlMarker | null>(null);
  const userCircleRef = useRef<mapgl.Circle | null>(null);
  const onMapReadyRef = useRef(onMapReady);
  const onViewportChangeRef = useRef(onViewportChange);
  const onMarkerHoverRef = useRef(onMarkerHover);
  const onMarkerSelectRef = useRef(onMarkerSelect);
  const onMarkerNavigateRef = useRef(onMarkerNavigate);
  const hoveredIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const suppressMapClickRef = useRef(false);
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
    onMarkerSelectRef.current = onMarkerSelect;
  }, [onMarkerSelect]);

  useEffect(() => {
    onMarkerNavigateRef.current = onMarkerNavigate;
  }, [onMarkerNavigate]);

  useEffect(() => {
    hoveredIdRef.current = hoveredId ?? null;
  }, [hoveredId]);

  useEffect(() => {
    selectedIdRef.current = selectedId ?? null;
  }, [selectedId]);

  const emitViewport = () => {
    const map = mapRef.current;
    if (!map || skipViewportEmitRef.current) return;
    const vp = readMapViewport(map);
    if (vp) onViewportChangeRef.current?.(vp);
  };

  const cancelMarkerExit = (id: string): boolean => {
    const wasExiting = exitingIdsRef.current.has(id);
    const timer = exitTimersRef.current.get(id);
    if (timer != null) {
      window.clearTimeout(timer);
      exitTimersRef.current.delete(id);
    }
    exitingIdsRef.current.delete(id);
    return wasExiting;
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
    const html = buildSalonPreviewHtml({
      coverUrl: m.coverUrl,
      name: m.label,
      address: m.address,
      ctaLabel: m.ctaLabel ?? "Salonni ko'rish",
    });
    const preview = new mapglAPI.HtmlMarker(map, {
      coordinates: toMapGlCoords(m.lat, m.lng),
      html,
      interactive: true,
      preventMapInteractions: true,
      zIndex: 20,
    });
    bindSalonPreviewNavigate(preview, () => onMarkerNavigateRef.current?.(m.id));
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
        ensureMarkerStyles();
        setMapReady(true);
        setMapError(null);
        onMapReadyRef.current?.(buildHandle());
        notifyResize();

        map.on("moveend", () => {
          if (!skipViewportEmitRef.current) emitViewport();
        });

        map.on("zoomend", () => {
          if (!skipViewportEmitRef.current) emitViewport();
        });

        map.on("click", () => {
          window.requestAnimationFrame(() => {
            if (suppressMapClickRef.current) {
              suppressMapClickRef.current = false;
              return;
            }
            if (selectedIdRef.current) {
              onMarkerSelectRef.current?.(null);
            }
          });
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
      exitTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      exitTimersRef.current.clear();
      exitingIdsRef.current.clear();
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
    const selected = selectedIdRef.current;

    for (const [id, marker] of markerRefs.current) {
      if (nextIds.has(id) || exitingIdsRef.current.has(id)) continue;

      exitingIdsRef.current.add(id);
      const stored = markerDataRef.current.get(id);
      const pinLabel = stored?.priceLabel || stored?.label.slice(0, 8) || "—";
      marker.setContent(buildPricePillHtml(false, pinLabel, false, "exit"));

      const timer = window.setTimeout(() => {
        marker.destroy();
        markerRefs.current.delete(id);
        markerDataRef.current.delete(id);
        exitingIdsRef.current.delete(id);
        exitTimersRef.current.delete(id);
      }, MARKER_EXIT_MS);
      exitTimersRef.current.set(id, timer);
    }

    for (const m of markers) {
      try {
        markerDataRef.current.set(m.id, m);
        const reEntering = cancelMarkerExit(m.id);

        const pinLabel = m.priceLabel || m.label.slice(0, 8);
        const isSelected = selected === m.id;
        const isHovered = hoverId === m.id;
        const existing = markerRefs.current.get(m.id);
        const motion = existing && !reEntering ? "none" : "enter";
        const html = buildPricePillHtml(isSelected, pinLabel, isHovered && !isSelected, motion);

        const bindMarker = (marker: mapgl.HtmlMarker) => {
          bindHtmlMarkerClick(marker, () => {
            suppressMapClickRef.current = true;
            const current = selectedIdRef.current;
            onMarkerSelectRef.current?.(current === m.id ? null : m.id);
          });
          bindHtmlMarkerHover(
            marker,
            () => onMarkerHoverRef.current?.(m.id),
            () => onMarkerHoverRef.current?.(null),
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
            zIndex: isSelected ? 12 : 10,
          });
          bindMarker(marker);
          markerRefs.current.set(m.id, marker);
        }
      } catch (err) {
        console.error("[Map2GIS] marker sync failed", m.id, err);
      }
    }
  }, [markers, selectedId, hoveredId, mapReady]);

  useEffect(() => {
    if (!selectedId) {
      hidePreview();
      return;
    }
    const m = markers.find((x) => x.id === selectedId);
    if (m) showPreview(m);
  }, [selectedId, markers]);

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
