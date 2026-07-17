import { useEffect, useId, useRef, useState } from "react";
import "./google-maps-types";
import { resolveGoogleMapsApiKey } from "./api-key";
import {
  DEFAULT_ZOOM,
  FIT_MAX_ZOOM,
  TASHKENT_CENTER,
  USER_RADIUS_M,
} from "./constants";
import { buildPricePillHtml, buildSalonPreviewHtml, buildUserDotHtml } from "./markers";
import { bindHtmlMarkerClick, bindHtmlMarkerHover, bindSalonPreviewInteractions } from "./html-marker-events";
import { HtmlOverlay, createHtmlOverlay } from "./html-overlay";
import { fitMapToPoints } from "./bounds";
import { loadGoogleMaps } from "./load-maps";
import { readMapViewport, type MapViewport } from "./viewport";
import type { MapMarker } from "./types";

const MARKER_EXIT_MS = 280;
const MARKER_STYLES_ID = "map-google-marker-keyframes";

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
  selectedId?: string | null;
  hoveredId?: string | null;
  onMarkerSelect?: (id: string | null) => void;
  onMarkerNavigate?: (id: string) => void;
  onMarkerHover?: (id: string | null) => void;
  onViewportChange?: (viewport: MapViewport) => void;
  showUserLocation?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  onMapReady?: (handle: MapHandle) => void;
  onMapError?: (message: string) => void;
  autoFitMarkers?: boolean;
  fitPadding?: { top?: number; right?: number; bottom?: number; left?: number };
  fitMaxZoom?: number;
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
  onMapError,
  autoFitMarkers = true,
  fitPadding,
  fitMaxZoom,
  className,
  style,
}: Map2GISProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<Map<string, HtmlOverlay>>(new Map());
  const markerDataRef = useRef<Map<string, MapMarker>>(new Map());
  const exitingIdsRef = useRef<Set<string>>(new Set());
  const exitTimersRef = useRef<Map<string, number>>(new Map());
  const previewRef = useRef<HtmlOverlay | null>(null);
  const userMarkerRef = useRef<HtmlOverlay | null>(null);
  const userCircleRef = useRef<google.maps.Circle | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const onMapReadyRef = useRef(onMapReady);
  const onMapErrorRef = useRef(onMapError);
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
    onMapErrorRef.current = onMapError;
  }, [onMapError]);

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
    if (!map) return;

    hidePreview();
    const html = buildSalonPreviewHtml({
      coverUrl: m.coverUrl,
      imageUrls: m.imageUrls,
      name: m.label,
      address: m.address,
      rating: m.rating,
      ctaLabel: m.ctaLabel ?? "Salonni ko'rish",
    });
    const preview = createHtmlOverlay(map, { lat: m.lat, lng: m.lng }, html, { zIndex: 20 });
    bindSalonPreviewInteractions(preview, {
      onNavigate: () => onMarkerNavigateRef.current?.(m.id),
      onClose: () => onMarkerSelectRef.current?.(null),
    });
    previewRef.current = preview;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let destroyed = false;
    let map: google.maps.Map | undefined;

    void (async () => {
      const apiKey = await resolveGoogleMapsApiKey();
      if (destroyed) return;
      if (!apiKey) {
        const message = "Xarita yuklanmadi. Google Maps API kaliti sozlanmagan.";
        setMapError(message);
        onMapErrorRef.current?.(message);
        return;
      }

      const notifyResize = () => {
        const m = mapRef.current;
        if (!m) return;
        google.maps.event.trigger(m, "resize");
      };

      const buildHandle = (): MapHandle => ({
        flyTo(lat, lng, zoom = 15) {
          const m = mapRef.current;
          if (!m) return;
          skipViewportEmitRef.current = true;
          m.panTo({ lat, lng });
          if (zoom && (m.getZoom() ?? 0) < zoom) {
            m.setZoom(zoom);
          }
          window.setTimeout(() => {
            skipViewportEmitRef.current = false;
            emitViewport();
          }, 600);
        },
        fitMarkers(items, padding) {
          const m = mapRef.current;
          if (!m) return;
          skipViewportEmitRef.current = true;
          if (items.length === 0) {
            m.setCenter(TASHKENT_CENTER);
            m.setZoom(DEFAULT_ZOOM);
          } else {
            fitMapToPoints(
              m,
              items.map((item) => ({ lat: item.lat, lng: item.lng })),
              {
                padding: {
                  ...DESKTOP_FIT_PAD,
                  bottom: padding?.bottom ?? DESKTOP_FIT_PAD.bottom,
                },
                maxZoom: FIT_MAX_ZOOM,
              },
            );
            const boosted = Math.min((m.getZoom() ?? DEFAULT_ZOOM) + 0.8, FIT_MAX_ZOOM);
            m.setZoom(boosted);
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
          m.setZoom(next);
          window.setTimeout(() => emitViewport(), 320);
        },
        zoomOut() {
          const m = mapRef.current;
          if (!m) return;
          const next = Math.max((m.getZoom() ?? DEFAULT_ZOOM) - 1, 10);
          m.setZoom(next);
          window.setTimeout(() => emitViewport(), 320);
        },
        resize: notifyResize,
        getViewport() {
          const m = mapRef.current;
          return m ? readMapViewport(m) : null;
        },
      });

      try {
        await loadGoogleMaps(apiKey);
        if (destroyed || !containerRef.current) return;

        map = new google.maps.Map(containerRef.current, {
          center: TASHKENT_CENTER,
          zoom: DEFAULT_ZOOM,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
          clickableIcons: false,
          keyboardShortcuts: false,
        });
        mapRef.current = map;
        ensureMarkerStyles();
        setMapReady(true);
        setMapError(null);
        onMapReadyRef.current?.(buildHandle());
        notifyResize();

        const onIdle = () => {
          if (!skipViewportEmitRef.current) emitViewport();
        };
        listenersRef.current.push(
          map.addListener("idle", onIdle),
          map.addListener("dragend", onIdle),
          map.addListener("zoom_changed", () => {
            if (!skipViewportEmitRef.current) emitViewport();
          }),
          map.addListener("click", () => {
            window.requestAnimationFrame(() => {
              if (suppressMapClickRef.current) {
                suppressMapClickRef.current = false;
                return;
              }
              if (selectedIdRef.current) {
                onMarkerSelectRef.current?.(null);
              }
            });
          }),
        );
      } catch (err: unknown) {
        console.error("[Map2GIS] failed to load Google Maps", err);
        const message = "Xarita yuklanmadi. Internet yoki Google Maps kalitini tekshiring.";
        setMapError(message);
        onMapErrorRef.current?.(message);
      }
    })();

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
      userCircleRef.current?.setMap(null);
      userCircleRef.current = null;
      if (typeof google !== "undefined" && google?.maps?.event) {
        listenersRef.current.forEach((l) => google.maps.event.removeListener(l));
      }
      listenersRef.current = [];
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

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

        const bindMarker = (marker: HtmlOverlay) => {
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
          existing.setCoordinates(m.lat, m.lng);
          existing.setZIndex(isSelected ? 12 : 10);
          bindMarker(existing);
        } else {
          const marker = createHtmlOverlay(map, { lat: m.lat, lng: m.lng }, html, {
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
    if (!mapReady || !map) return;

    userMarkerRef.current?.destroy();
    userMarkerRef.current = null;
    userCircleRef.current?.setMap(null);
    userCircleRef.current = null;

    if (!showUserLocation || !userLocation) return;

    userMarkerRef.current = createHtmlOverlay(
      map,
      { lat: userLocation.lat, lng: userLocation.lng },
      buildUserDotHtml(),
      { zIndex: 15 },
    );
    userCircleRef.current = new google.maps.Circle({
      map,
      center: userLocation,
      radius: USER_RADIUS_M,
      fillColor: "#141414",
      fillOpacity: 0.05,
      strokeColor: "#141414",
      strokeOpacity: 0.2,
      strokeWeight: 1,
      clickable: false,
    });
  }, [showUserLocation, userLocation, mapReady]);

  useEffect(() => {
    if (!autoFitMarkers) return;
    const map = mapRef.current;
    if (!mapReady || !map) return;

    if (!markers.some((m) => m.id)) {
      map.setCenter(TASHKENT_CENTER);
      map.setZoom(DEFAULT_ZOOM);
      initialFitDoneRef.current = false;
      return;
    }

    if (initialFitDoneRef.current) return;
    initialFitDoneRef.current = true;
    skipViewportEmitRef.current = true;
    fitMapToPoints(
      map,
      markers.map((m) => ({ lat: m.lat, lng: m.lng })),
      {
        padding: { top: 72, right: 48, bottom: BOTTOM_PAD, left: 48, ...fitPadding },
        maxZoom: fitMaxZoom ?? FIT_MAX_ZOOM,
      },
    );
    window.setTimeout(() => {
      skipViewportEmitRef.current = false;
      emitViewport();
    }, 450);
  }, [markers, mapReady, autoFitMarkers, fitPadding, fitMaxZoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !mapReady) return;

    const ro = new ResizeObserver(() => {
      const m = mapRef.current;
      if (m) google.maps.event.trigger(m, "resize");
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapReady]);

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%", ...style }}>
      <div
        ref={containerRef}
        id={`map-google-${reactId}`}
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
