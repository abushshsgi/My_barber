import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapDesktopMapControls } from "@/components/map/MapDesktopMapControls";
import { MapDesktopMapFrame } from "@/components/map/MapDesktopMapFrame";
import { MapDesktopPanel } from "@/components/map/MapDesktopPanel";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import { MapSalonSheet } from "@/components/map/MapSalonSheet";
import { SalonMap, type SalonMapHandle, type SalonMapMarker, type SalonMapViewport } from "@/components/map/SalonMap";
import { resolveMapAudienceFilter, useAudience } from "@/hooks/use-audience";
import { useRecommendContext } from "@/hooks/use-recommend-context";
import { useSalonsList, useSalonsNearby } from "@/hooks/use-salons";
import { shortPrice, type Salon } from "@/lib/mock-data";
import {
  DEFAULT_MAP_FILTERS,
  applyMapSalonFilters,
  countActiveMapFilters,
  serializeMapFilters,
  type MapFiltersState,
} from "@/lib/map-filters";
import { hasValidMapCoords, salonMatchesMapAudience } from "@/lib/map-utils";
import { filterSalonsByViewport, normalizeMapCoords } from "@/lib/map-viewport";
import { rankSalonsForUser } from "@/lib/recommendations";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Xarita — mysaloon.uz" },
      { name: "description", content: "Yaqin atrofdagi salonlar va ustalarni xaritada toping." },
    ],
  }),
  component: MapView,
});

function withNormalizedCoords(salon: Salon): Salon {
  const { lat, lng } = normalizeMapCoords(salon.lat, salon.lng);
  if (lat === salon.lat && lng === salon.lng) return salon;
  return { ...salon, lat, lng };
}

function mapPinLabel(salon: Salon): string {
  if (salon.priceFrom > 0) return shortPrice(salon.priceFrom);
  if (salon.rating > 0) return `★ ${salon.rating.toFixed(1)}`;
  return "—";
}

function toMapMarker(salon: Salon, ctaLabel: string): SalonMapMarker {
  return {
    id: salon.id,
    lat: salon.lat,
    lng: salon.lng,
    label: salon.name,
    coverUrl: salon.coverUrl,
    address: salon.address,
    ctaLabel,
    priceLabel: mapPinLabel(salon),
  };
}

type SalonMapProps = {
  markers: SalonMapMarker[];
  selectedId: string | null;
  hoveredId: string | null;
  onMarkerSelect: (id: string | null) => void;
  onMarkerNavigate: (id: string) => void;
  onMarkerHover: (id: string | null) => void;
  onViewportChange: (viewport: SalonMapViewport) => void;
  showUserLocation: boolean;
  userLocation: { lat: number; lng: number } | null;
  onMapReady?: (handle: SalonMapHandle) => void;
  autoFitMarkers?: boolean;
};

function MapCanvas({
  markers,
  selectedId,
  hoveredId,
  onMarkerSelect,
  onMarkerNavigate,
  onMarkerHover,
  onViewportChange,
  showUserLocation,
  userLocation,
  onMapReady,
  autoFitMarkers,
}: SalonMapProps) {
  return (
    <MapErrorBoundary>
      <SalonMap
        markers={markers}
        selectedId={selectedId}
        hoveredId={hoveredId}
        onMarkerSelect={onMarkerSelect}
        onMarkerNavigate={onMarkerNavigate}
        onMarkerHover={onMarkerHover}
        onViewportChange={onViewportChange}
        showUserLocation={showUserLocation}
        userLocation={userLocation}
        onMapReady={onMapReady}
        autoFitMarkers={autoFitMarkers}
      />
    </MapErrorBoundary>
  );
}

function MapView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { audience, profileDefault } = useAudience();
  const mapAudience = useMemo(() => {
    if (audience !== "all") return audience;
    return resolveMapAudienceFilter(profileDefault);
  }, [audience, profileDefault]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const ctx = useRecommendContext();
  const hasCoords = ctx.lat != null && ctx.lng != null;
  const { data: nearbySalons = [], isLoading: nearbyLoading } = useSalonsNearby(
    hasCoords ? ctx.lat! : undefined,
    hasCoords ? ctx.lng! : undefined,
    25,
  );
  const { data: listSalons = [], isLoading: listLoading } = useSalonsList();
  const listLoadingAny = listLoading || nearbyLoading;

  const baseSalons = useMemo(() => {
    const base = hasCoords && nearbySalons.length > 0 ? nearbySalons : listSalons;
    return rankSalonsForUser(base, ctx).map(withNormalizedCoords);
  }, [hasCoords, nearbySalons, listSalons, ctx]);

  const salonsWithCoords = useMemo(
    () => baseSalons.filter((s) => hasValidMapCoords(s.lat, s.lng)),
    [baseSalons],
  );

  const userLocation = useMemo(() => {
    if (ctx.lat == null || ctx.lng == null) return null;
    const { lat, lng } = normalizeMapCoords(ctx.lat, ctx.lng);
    if (!hasValidMapCoords(lat, lng)) return null;
    return { lat, lng };
  }, [ctx.lat, ctx.lng]);

  const [active, setActive] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<MapFiltersState>(DEFAULT_MAP_FILTERS);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [desktopMapExpanded, setDesktopMapExpanded] = useState(false);
  const [mapHandle, setMapHandle] = useState<SalonMapHandle | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [viewport, setViewport] = useState<SalonMapViewport | null>(null);
  const mapHandleRef = useRef<SalonMapHandle | null>(null);
  const viewportTimerRef = useRef<number | null>(null);

  const getMapHandle = useCallback(() => mapHandleRef.current, []);

  const onMapReady = useCallback((handle: SalonMapHandle) => {
    mapHandleRef.current = handle;
    setMapHandle(handle);
    setMapReady(true);
    const vp = handle.getViewport();
    if (vp) setViewport(vp);
    const resize = () => handle.resize();
    resize();
    [50, 200, 500].forEach((ms) => window.setTimeout(resize, ms));
  }, []);

  const onViewportChange = useCallback((vp: SalonMapViewport) => {
    if (viewportTimerRef.current != null) {
      window.clearTimeout(viewportTimerRef.current);
    }
    viewportTimerRef.current = window.setTimeout(() => {
      setViewport(vp);
      viewportTimerRef.current = null;
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (viewportTimerRef.current != null) {
        window.clearTimeout(viewportTimerRef.current);
      }
    };
  }, []);

  const expandDesktopMap = useCallback(() => {
    setDesktopMapExpanded(true);
  }, []);

  const collapseDesktopMap = useCallback(() => {
    setDesktopMapExpanded(false);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const audienceFiltered = salonsWithCoords.filter((s) => salonMatchesMapAudience(s, mapAudience));
    const searchFiltered = audienceFiltered.filter((s) => {
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q);
    });
    return applyMapSalonFilters(searchFiltered, filters);
  }, [query, salonsWithCoords, mapAudience, filters]);

  const visibleSalons = useMemo(() => {
    if (!viewport) return filtered;
    return filterSalonsByViewport(filtered, viewport);
  }, [filtered, viewport]);

  useEffect(() => {
    if (visibleSalons.length === 0) {
      setActive("");
      return;
    }
    if (!active && visibleSalons[0]) {
      setActive(visibleSalons[0].id);
      return;
    }
    if (active && !visibleSalons.some((s) => s.id === active)) {
      setActive(visibleSalons[0]?.id ?? "");
    }
  }, [visibleSalons]);

  useEffect(() => {
    if (selected && !visibleSalons.some((s) => s.id === selected)) {
      setSelected(null);
    }
  }, [visibleSalons, selected]);

  const ctaLabel = t("map.viewSalon");

  const mapMarkers = useMemo(
    (): SalonMapMarker[] => visibleSalons.map((s) => toMapMarker(s, ctaLabel)),
    [visibleSalons, ctaLabel],
  );

  const goToSalon = useCallback(
    (id: string) => {
      void navigate({ to: "/salon/$id", params: { id } });
    },
    [navigate],
  );

  const focusSalon = useCallback((id: string) => {
    setActive(id);
  }, []);

  const onMarkerSelect = useCallback((id: string | null) => {
    setSelected(id);
    if (id) setActive(id);
  }, []);

  const onMarkerHover = useCallback((id: string | null) => {
    setHovered(id);
  }, []);

  const fitKey = useMemo(
    () => `${query}|${mapAudience}|${serializeMapFilters(filters)}`,
    [query, mapAudience, filters],
  );

  const fitMarkers = useMemo(
    (): SalonMapMarker[] => filtered.map((s) => toMapMarker(s, ctaLabel)),
    [filtered, ctaLabel],
  );

  useEffect(() => {
    if (fitMarkers.length === 0) return;
    if (!mapHandleRef.current) return;
    const fit = () => mapHandleRef.current?.fitMarkers(fitMarkers, { bottom: 48 });
    fit();
    const delays = [120, 400].map((ms) => window.setTimeout(fit, ms));
    return () => delays.forEach((id) => window.clearTimeout(id));
  }, [fitKey, fitMarkers, mapReady]);

  useEffect(() => {
    const handle = mapHandleRef.current;
    if (!handle) return;
    const resize = () => handle.resize();
    resize();
    const delays = [50, 150, 350, 600].map((ms) => window.setTimeout(resize, ms));
    return () => delays.forEach((id) => window.clearTimeout(id));
  }, [desktopMapExpanded]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    if (mq.matches) return;

    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  const emptyMessage = query.trim()
    ? t("map.emptySearch")
    : countActiveMapFilters(filters) > 0
      ? t("map.emptyFilters")
      : mapAudience === "men"
        ? t("map.emptyMen")
        : mapAudience === "women"
          ? t("map.emptyWomen")
          : t("map.empty");

  const sharedMapProps: SalonMapProps = {
    markers: mapMarkers,
    selectedId: selected,
    hoveredId: hovered,
    onMarkerSelect,
    onMarkerNavigate: goToSalon,
    onMarkerHover,
    onViewportChange,
    showUserLocation: !sheetExpanded,
    userLocation,
  };

  return (
    <>
      <div className="relative h-full min-h-0 overflow-hidden bg-surface lg:hidden">
        <div className="absolute inset-0">
          {mounted ? (
            <MapCanvas {...sharedMapProps} onMapReady={onMapReady} autoFitMarkers={false} />
          ) : (
            <div className="h-full w-full bg-surface" />
          )}
        </div>

        {listLoadingAny && filtered.length === 0 ? (
          <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-[22px] border-t border-border/50 bg-background p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground">{t("map.loading")}</p>
          </div>
        ) : null}

        {!listLoadingAny && filtered.length === 0 ? (
          <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-[22px] border-t border-border/50 bg-background p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : null}

        {!listLoadingAny ? (
          <MapSalonSheet
            salons={visibleSalons}
            activeId={active || visibleSalons[0]?.id || ""}
            onActiveChange={focusSalon}
            query={query}
            onQueryChange={setQuery}
            filters={filters}
            onFiltersChange={setFilters}
            mapAudience={mapAudience}
            onExpandedChange={setSheetExpanded}
          />
        ) : null}
      </div>

      <div className="relative hidden h-full min-h-0 w-full overflow-hidden lg:flex">
        {!desktopMapExpanded ? (
          <MapDesktopPanel
            salons={visibleSalons}
            highlightedId={selected || hovered || active}
            scrollToId={active}
            query={query}
            onQueryChange={setQuery}
            filters={filters}
            onFiltersChange={setFilters}
            mapAudience={mapAudience}
            onSalonHover={onMarkerHover}
            loading={listLoadingAny}
            emptyMessage={emptyMessage}
          />
        ) : null}
        <MapDesktopMapControls
          expanded={desktopMapExpanded}
          getMapHandle={getMapHandle}
          mapReady={mapReady}
          onExpand={expandDesktopMap}
          onCollapse={collapseDesktopMap}
        />
        <MapDesktopMapFrame expanded={desktopMapExpanded}>
          {mounted ? (
            <MapCanvas
              {...sharedMapProps}
              onMapReady={onMapReady}
              autoFitMarkers={false}
            />
          ) : (
            <div className="h-full w-full bg-surface" />
          )}
        </MapDesktopMapFrame>
      </div>
    </>
  );
}
