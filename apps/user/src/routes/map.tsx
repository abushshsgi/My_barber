import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapDiscoveryTabs, type MapDiscoveryTab } from "@/components/map/MapDiscoveryTabs";
import { MapBarberList } from "@/components/map/MapBarberList";
import { MapDesktopMapFrame } from "@/components/map/MapDesktopMapFrame";
import { MapDesktopMapControls } from "@/components/map/MapDesktopMapControls";
import { MapDesktopPanel } from "@/components/map/MapDesktopPanel";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import { MapSalonSheet } from "@/components/map/MapSalonSheet";
import { MapAreaSkeleton, MapMobileSheetSkeleton } from "@/components/map/MapLoadingSkeleton";
import { SalonMap, type SalonMapHandle, type SalonMapMarker, type SalonMapViewport } from "@/components/map/SalonMap";
import { resolveMapAudienceFilter, matchBarberGender, useAudience } from "@/hooks/use-audience";
import { useIsLgUp } from "@/hooks/use-mobile";
import { useRecommendContext } from "@/hooks/use-recommend-context";
import { useSalonsList, useSalonsNearby, useSalonSearch } from "@/hooks/use-salons";
import { useBarbersNearby, useBarberFind, useBarbersList } from "@/hooks/use-barbers";
import { useMe } from "@/hooks/use-me";
import { shortPrice, type Salon } from "@/lib/mock-data";
import { PLACEHOLDER_SALON } from "@/lib/cover-images";
import { applyMapBarberFilters } from "@/lib/map-barber-filters";
import {
  DEFAULT_MAP_FILTERS,
  applyMapSalonFilters,
  countActiveMapFilters,
  type MapFiltersState,
} from "@/lib/map-filters";
import type { BarberDiscovery } from "@/lib/mappers/barber";
import { hasValidMapCoords, salonMatchesMapAudience } from "@/lib/map-utils";
import { filterSalonsByViewport, normalizeMapCoords } from "@/lib/map-viewport";
import { rankBarbersForUser, rankSalonsForUser } from "@/lib/recommendations";
import { parseMapRouteSearch } from "@/lib/map-route-search";
import { NoSalonsEmpty } from "@/components/NoSalonsEmpty";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Xarita — mysaloon.uz" },
      { name: "description", content: "Yaqin atrofdagi salonlar va ustalarni xaritada toping." },
    ],
  }),
  validateSearch: parseMapRouteSearch,
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
  const fallback = PLACEHOLDER_SALON;
  const coverRaw = salon.coverUrl?.trim() || "";
  const cover =
    coverRaw &&
    !coverRaw.includes("/covers/pexels/") &&
    !coverRaw.includes("images.pexels.com") &&
    !coverRaw.includes("picsum.photos")
      ? coverRaw
      : fallback;
  const portfolio = (salon.portfolio ?? [])
    .map((u) => u.trim())
    .filter(
      (url) =>
        Boolean(url) &&
        !url.includes("/covers/pexels/") &&
        !url.includes("images.pexels.com") &&
        !url.includes("picsum.photos"),
    );
  const imageUrls = [cover, ...portfolio].filter((url, i, arr) => arr.indexOf(url) === i);

  return {
    id: salon.id,
    lat: salon.lat,
    lng: salon.lng,
    label: salon.name,
    coverUrl: cover,
    imageUrls,
    address: salon.address,
    rating: salon.rating,
    ctaLabel,
    priceLabel: mapPinLabel(salon),
  };
}

function toBarberMarker(barber: BarberDiscovery, ctaLabel: string): SalonMapMarker {
  const initial = barber.name.trim().split(/\s+/)[0]?.slice(0, 8) || "U";
  const cover = barber.avatar?.trim() || undefined;
  return {
    id: barber.id,
    lat: barber.lat,
    lng: barber.lng,
    label: barber.name,
    coverUrl: cover,
    imageUrls: cover ? [cover] : [],
    address: barber.salonName ?? "",
    rating: barber.rating,
    ctaLabel,
    priceLabel: barber.rating > 0 ? `★ ${barber.rating.toFixed(1)}` : initial,
  };
}

function withBarberCoords(barber: BarberDiscovery): BarberDiscovery {
  const { lat, lng } = normalizeMapCoords(barber.lat, barber.lng);
  if (lat === barber.lat && lng === barber.lng) return barber;
  return { ...barber, lat, lng };
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
  onMapError?: (message: string) => void;
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
  onMapError,
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
        onMapError={onMapError}
        autoFitMarkers={autoFitMarkers}
      />
    </MapErrorBoundary>
  );
}

function MapView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { q: routeQ, category: routeCategory } = Route.useSearch();
  const { audience, profileDefault } = useAudience();
  const mapAudience = useMemo(() => {
    if (audience !== "all") return audience;
    return resolveMapAudienceFilter(profileDefault);
  }, [audience, profileDefault]);
  const [mounted, setMounted] = useState(false);
  const isLgUp = useIsLgUp();
  useEffect(() => setMounted(true), []);

  const ctx = useRecommendContext();
  const { data: me } = useMe();
  const catalogRegion = me?.region?.trim() || ctx.region?.trim() || undefined;
  const hasCoords = ctx.lat != null && ctx.lng != null;
  const [discoveryTab, setDiscoveryTab] = useState<MapDiscoveryTab>("salons");
  const [query, setQuery] = useState(routeQ);
  const apiSearchActive = query.trim().length >= 2;
  const { data: apiSearchSalons = [] } = useSalonSearch(apiSearchActive ? query : "");
  const { data: apiSearchBarbers = [] } = useBarberFind(apiSearchActive ? query : "", apiSearchActive);
  const {
    data: nearbySalons = [],
    isLoading: nearbyLoading,
    isError: nearbyError,
    refetch: refetchNearby,
  } = useSalonsNearby(
    hasCoords ? ctx.lat! : undefined,
    hasCoords ? ctx.lng! : undefined,
    40,
  );
  const {
    data: listSalons = [],
    isLoading: listLoading,
    isError: listError,
    refetch: refetchList,
  } = useSalonsList(catalogRegion);
  const {
    data: nearbyBarbers = [],
    isLoading: barbersLoading,
    isError: barbersError,
    refetch: refetchBarbers,
  } = useBarbersNearby(
    hasCoords ? ctx.lat! : undefined,
    hasCoords ? ctx.lng! : undefined,
    40,
    discoveryTab === "barbers",
  );
  const {
    data: listBarbers = [],
    isLoading: listBarbersLoading,
    isError: listBarbersError,
    refetch: refetchListBarbers,
  } = useBarbersList(catalogRegion, discoveryTab === "barbers");

  const baseSalons = useMemo(() => {
    let base =
      hasCoords && nearbySalons.length > 0 ? nearbySalons : listSalons;
    if (apiSearchActive && apiSearchSalons.length > 0) {
      const byId = new Map(base.map((s) => [s.id, s]));
      for (const s of apiSearchSalons) byId.set(s.id, s);
      base = [...byId.values()];
    }
    return rankSalonsForUser(base, ctx).map(withNormalizedCoords);
  }, [hasCoords, nearbySalons, listSalons, ctx, apiSearchActive, apiSearchSalons]);

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
  const [filters, setFilters] = useState<MapFiltersState>(() => ({
    ...DEFAULT_MAP_FILTERS,
    category: routeCategory,
  }));
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [desktopMapExpanded, setDesktopMapExpanded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<SalonMapViewport | null>(null);
  const mapHandleRef = useRef<SalonMapHandle | null>(null);
  const initialFitDoneRef = useRef(false);
  const userHasPannedRef = useRef(false);

  useEffect(() => {
    setQuery(routeQ);
  }, [routeQ]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, category: routeCategory }));
  }, [routeCategory]);

  const getMapHandle = useCallback(() => mapHandleRef.current, []);

  const onMapReady = useCallback((handle: SalonMapHandle) => {
    mapHandleRef.current = handle;
    setMapLoadError(null);
    setMapReady(true);
    const vp = handle.getViewport();
    if (vp) setViewport(vp);
    const resize = () => handle.resize();
    resize();
    [50, 200, 500].forEach((ms) => window.setTimeout(resize, ms));
  }, []);

  const onMapError = useCallback((message: string) => {
    setMapLoadError(message);
    setMapReady(true);
  }, []);

  const onViewportChange = useCallback((vp: SalonMapViewport) => {
    userHasPannedRef.current = true;
    setViewport(vp);
  }, []);

  const expandDesktopMap = useCallback(() => {
    setDesktopMapExpanded(true);
  }, []);

  const collapseDesktopMap = useCallback(() => {
    setDesktopMapExpanded(false);
  }, []);

  const baseBarbers = useMemo(() => {
    let barbers =
      apiSearchActive && apiSearchBarbers.length > 0
        ? apiSearchBarbers
        : nearbyBarbers.length > 0
          ? nearbyBarbers
          : listBarbers;
    if (apiSearchActive && apiSearchBarbers.length > 0 && (nearbyBarbers.length > 0 || listBarbers.length > 0)) {
      const byId = new Map(
        (nearbyBarbers.length > 0 ? nearbyBarbers : listBarbers).map((b) => [b.id, b]),
      );
      for (const b of apiSearchBarbers) byId.set(b.id, b);
      // Prefer API hits first when searching
      barbers = apiSearchBarbers.map((b) => byId.get(b.id) ?? b);
    }
    return rankBarbersForUser(barbers.map(withBarberCoords), ctx).filter((b) =>
      hasValidMapCoords(b.lat, b.lng),
    );
  }, [nearbyBarbers, listBarbers, apiSearchActive, apiSearchBarbers, ctx]);

  const catalogHasData =
    discoveryTab === "salons" ? salonsWithCoords.length > 0 : baseBarbers.length > 0;
  const listLoadingAny =
    !catalogHasData &&
    (discoveryTab === "salons"
      ? listLoading || (hasCoords && nearbyLoading)
      : barbersLoading || listBarbersLoading);
  const catalogError =
    discoveryTab === "salons" ? nearbyError || listError : barbersError || listBarbersError;

  const filteredBarbers = useMemo(() => {
    const genderFiltered = baseBarbers.filter((b) => matchBarberGender(b.gender, mapAudience));
    if (apiSearchActive) {
      return applyMapBarberFilters(genderFiltered, filters);
    }
    const q = query.trim().toLowerCase();
    const searchFiltered = genderFiltered.filter((b) => {
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        (b.salonName?.toLowerCase().includes(q) ?? false)
      );
    });
    return applyMapBarberFilters(searchFiltered, filters);
  }, [query, baseBarbers, filters, apiSearchActive, mapAudience]);

  const visibleBarbers = useMemo(() => {
    if (!viewport) return filteredBarbers;
    return filterSalonsByViewport(filteredBarbers, viewport);
  }, [filteredBarbers, viewport]);

  const filtered = useMemo(() => {
    const audienceFiltered = salonsWithCoords.filter((s) => salonMatchesMapAudience(s, mapAudience));
    if (apiSearchActive) {
      return applyMapSalonFilters(audienceFiltered, filters);
    }
    const q = query.trim().toLowerCase();
    const searchFiltered = audienceFiltered.filter((s) => {
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q);
    });
    return applyMapSalonFilters(searchFiltered, filters);
  }, [query, salonsWithCoords, mapAudience, filters, apiSearchActive]);

  const visibleSalons = useMemo(() => {
    if (!viewport) return filtered;
    return filterSalonsByViewport(filtered, viewport);
  }, [filtered, viewport]);

  useEffect(() => {
    setSelected(null);
    userHasPannedRef.current = false;
    initialFitDoneRef.current = false;
  }, [discoveryTab]);

  useEffect(() => {
    const items = discoveryTab === "salons" ? filtered : filteredBarbers;
    const visible = discoveryTab === "salons" ? visibleSalons : visibleBarbers;
    if (items.length === 0) {
      setActive("");
      return;
    }
    if (visible.length === 0) {
      setActive("");
      return;
    }
    setActive((prev) => {
      if (prev && visible.some((s) => s.id === prev)) return prev;
      return visible[0].id;
    });
  }, [discoveryTab, filtered, filteredBarbers, visibleSalons, visibleBarbers]);

  const sidebarSalons = useMemo(() => {
    if (!selected) return visibleSalons;
    if (visibleSalons.some((s) => s.id === selected)) return visibleSalons;
    const pinned = filtered.find((s) => s.id === selected);
    return pinned ? [...visibleSalons, pinned] : visibleSalons;
  }, [visibleSalons, selected, filtered]);

  const sidebarBarbers = useMemo(() => {
    if (!selected) return visibleBarbers;
    if (visibleBarbers.some((b) => b.id === selected)) return visibleBarbers;
    const pinned = filteredBarbers.find((b) => b.id === selected);
    return pinned ? [...visibleBarbers, pinned] : visibleBarbers;
  }, [visibleBarbers, selected, filteredBarbers]);

  const mapSalons = sidebarSalons;

  const ctaLabel =
    discoveryTab === "salons"
      ? t("map.viewSalon")
      : t("map.viewProfile", { defaultValue: "Profil" });

  const mapMarkers = useMemo((): SalonMapMarker[] => {
    if (discoveryTab === "barbers") {
      return sidebarBarbers.map((b) => toBarberMarker(b, ctaLabel));
    }
    return mapSalons.map((s) => toMapMarker(s, ctaLabel));
  }, [discoveryTab, sidebarBarbers, mapSalons, ctaLabel]);

  const goToSalon = useCallback(
    (id: string) => {
      void navigate({ to: "/salon/$id", params: { id } });
    },
    [navigate],
  );

  const goToBarber = useCallback(
    (id: string) => {
      const barber = sidebarBarbers.find((b) => b.id === id);
      if (!barber) return;
      void navigate({ to: "/barber/$barberId", params: { barberId: barber.barberId } });
    },
    [navigate, sidebarBarbers],
  );

  const onMarkerNavigate = useCallback(
    (id: string) => {
      if (discoveryTab === "barbers") goToBarber(id);
      else goToSalon(id);
    },
    [discoveryTab, goToBarber, goToSalon],
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

  const fitMarkers = useMemo((): SalonMapMarker[] => {
    if (discoveryTab === "barbers") {
      return filteredBarbers.map((b) => toBarberMarker(b, ctaLabel));
    }
    return filtered.map((s) => toMapMarker(s, ctaLabel));
  }, [discoveryTab, filteredBarbers, filtered, ctaLabel]);

  useEffect(() => {
    if (fitMarkers.length === 0) return;
    if (!mapHandleRef.current) return;
    if (initialFitDoneRef.current && userHasPannedRef.current) return;
    const fit = () => mapHandleRef.current?.fitMarkers(fitMarkers, { bottom: 48 });
    fit();
    const delays = [120, 400].map((ms) => window.setTimeout(fit, ms));
    initialFitDoneRef.current = true;
    return () => delays.forEach((id) => window.clearTimeout(id));
  }, [fitMarkers, mapReady]);

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
    const applyOverflow = () => {
      if (mq.matches) return;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    };
    const clearOverflow = () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };

    if (!mq.matches) applyOverflow();
    const onChange = () => {
      if (mq.matches) clearOverflow();
      else applyOverflow();
    };
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
      clearOverflow();
    };
  }, []);

  const viewportEmpty =
    !listLoadingAny &&
    !catalogError &&
    (discoveryTab === "salons"
      ? filtered.length > 0 && visibleSalons.length === 0
      : filteredBarbers.length > 0 && visibleBarbers.length === 0);

  const emptyMessage = catalogError
    ? t("map.loadError", { defaultValue: "Salonlar yuklanmadi" })
    : query.trim()
      ? t("map.emptySearch")
      : countActiveMapFilters(filters) > 0
        ? t("map.emptyFilters")
        : discoveryTab === "barbers"
          ? t("map.emptyBarbers", { defaultValue: "Yaqin atrofda usta topilmadi" })
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
    onMarkerNavigate,
    onMarkerHover,
    onViewportChange,
    showUserLocation: !sheetExpanded,
    userLocation,
  };

  const showMapSkeleton =
    listLoadingAny &&
    (discoveryTab === "salons" ? salonsWithCoords.length === 0 : baseBarbers.length === 0);
  const showMapBootOverlay = mounted && !mapReady && !showMapSkeleton && !mapLoadError;

  const retryCatalog = useCallback(() => {
    if (discoveryTab === "salons") {
      void refetchList();
      if (hasCoords) void refetchNearby();
    } else {
      if (hasCoords) void refetchBarbers();
      void refetchListBarbers();
    }
  }, [discoveryTab, refetchList, refetchNearby, refetchBarbers, refetchListBarbers, hasCoords]);

  const mapCanvas = mounted ? (
    <>
      <MapCanvas
        {...sharedMapProps}
        onMapReady={onMapReady}
        onMapError={onMapError}
        autoFitMarkers={false}
      />
      {mapLoadError ? (
        <div className="absolute inset-x-4 top-4 z-30 rounded-2xl border border-destructive/30 bg-background/95 p-3 text-center shadow-sm">
          <p className="text-sm font-medium text-destructive">{mapLoadError}</p>
        </div>
      ) : null}
      {showMapSkeleton || showMapBootOverlay ? (
        <div className="absolute inset-0 z-20 transition-opacity duration-500 pointer-events-none">
          <MapAreaSkeleton className="h-full w-full" />
        </div>
      ) : null}
    </>
  ) : (
    <MapAreaSkeleton className="h-full w-full" />
  );

  return (
    <>
      {!isLgUp ? (
      <div className="relative h-full min-h-0 overflow-hidden bg-surface">
        <div className="absolute inset-0">
          {mapCanvas}
        </div>

        {!listLoadingAny && catalogError ? (
          <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-[22px] border-t border-border/50 bg-background p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground">{emptyMessage}</p>
            <button
              type="button"
              onClick={retryCatalog}
              className="mt-3 rounded-2xl bg-foreground px-4 py-2 text-sm font-bold text-background"
            >
              {t("common.retry", { defaultValue: "Qayta urinish" })}
            </button>
          </div>
        ) : !listLoadingAny &&
          (discoveryTab === "salons" ? filtered.length === 0 : filteredBarbers.length === 0) ? (
          <div className="absolute inset-x-0 bottom-0 z-30 max-h-[48%] overflow-y-auto rounded-t-[22px] border-t border-border/50 bg-background p-4">
            {discoveryTab === "salons" ? (
              <NoSalonsEmpty compact hideStyleCtas />
            ) : (
              <p className="text-center text-sm font-medium text-muted-foreground">{emptyMessage}</p>
            )}
          </div>
        ) : null}

        {viewportEmpty ? (
          <div className="absolute inset-x-4 top-20 z-30 rounded-2xl border border-border bg-background/95 px-4 py-3 text-center shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              {discoveryTab === "barbers"
                ? t("map.emptyViewportBarbers", { defaultValue: "Bu hududda usta yo'q — xaritani siljiting." })
                : t("map.emptyViewport", { defaultValue: "Bu hududda salon yo'q — xaritani siljiting." })}
            </p>
          </div>
        ) : null}

        {listLoadingAny ? (
          <MapMobileSheetSkeleton />
        ) : discoveryTab === "salons" ? (
          <MapSalonSheet
            salons={sidebarSalons}
            activeId={active}
            onActiveChange={focusSalon}
            query={query}
            onQueryChange={setQuery}
            filters={filters}
            onFiltersChange={setFilters}
            mapAudience={mapAudience}
            onExpandedChange={setSheetExpanded}
            headerSlot={
              <MapDiscoveryTabs value={discoveryTab} onChange={setDiscoveryTab} className="w-full justify-center" />
            }
          />
        ) : (
          <div className="absolute inset-x-0 bottom-0 z-30 max-h-[55vh] overflow-hidden rounded-t-[22px] border-t border-border bg-background shadow-lg">
            <div className="border-b border-border px-4 py-3 space-y-3">
              <MapDiscoveryTabs value={discoveryTab} onChange={setDiscoveryTab} className="w-full justify-center" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("common.search")}
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
              />
            </div>
            <div className="max-h-[calc(55vh-88px)] overflow-y-auto">
              <MapBarberList
                barbers={sidebarBarbers}
                activeId={active}
                onActiveChange={focusSalon}
                emptyMessage={emptyMessage}
              />
            </div>
          </div>
        )}
      </div>
      ) : (
      <div className="relative flex h-full min-h-0 w-full overflow-hidden">
        {!desktopMapExpanded ? (
          discoveryTab === "salons" ? (
            <MapDesktopPanel
              salons={sidebarSalons}
              highlightedId={selected || hovered || active}
              scrollToId={selected ?? undefined}
              query={query}
              onQueryChange={setQuery}
              filters={filters}
              onFiltersChange={setFilters}
              mapAudience={mapAudience}
              onSalonHover={onMarkerHover}
              loading={listLoadingAny}
              emptyMessage={emptyMessage}
              viewportEmpty={viewportEmpty}
              headerSlot={
                <MapDiscoveryTabs value={discoveryTab} onChange={setDiscoveryTab} />
              }
            />
          ) : (
            <div
              className="flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-background"
              style={{ width: 380 }}
            >
              <div className="border-b border-border px-4 py-4 space-y-3">
                <MapDiscoveryTabs value={discoveryTab} onChange={setDiscoveryTab} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("common.search")}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                <MapBarberList
                  barbers={sidebarBarbers}
                  activeId={active}
                  onActiveChange={focusSalon}
                  onHover={onMarkerHover}
                  loading={listLoadingAny}
                  emptyMessage={emptyMessage}
                />
              </div>
            </div>
          )
        ) : null}
        <MapDesktopMapFrame expanded={desktopMapExpanded}>
          <div className="relative h-full w-full">
            {mapCanvas}
            <MapDesktopMapControls
              expanded={desktopMapExpanded}
              getMapHandle={getMapHandle}
              mapReady={mapReady}
              onExpand={expandDesktopMap}
              onCollapse={collapseDesktopMap}
            />
          </div>
        </MapDesktopMapFrame>
      </div>
      )}
    </>
  );
}
