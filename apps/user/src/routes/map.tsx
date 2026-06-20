import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapDesktopMapControls } from "@/components/map/MapDesktopMapControls";
import { MapDesktopMapFrame } from "@/components/map/MapDesktopMapFrame";
import { MapDesktopPanel } from "@/components/map/MapDesktopPanel";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import { MapSalonSheet } from "@/components/map/MapSalonSheet";
import { SalonMap, type SalonMapHandle, type SalonMapMarker } from "@/components/map/SalonMap";
import { resolveMapAudienceFilter, useAudience } from "@/hooks/use-audience";
import { useMe } from "@/hooks/use-me";
import { useSalonsList } from "@/hooks/use-salons";
import { shortPrice } from "@/lib/mock-data";
import { hasValidMapCoords, salonMatchesMapAudience } from "@/lib/map-utils";
import { rankSalonsForUser, userRecommendContext } from "@/lib/recommendations";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Xarita — mysaloon.uz" },
      { name: "description", content: "Yaqin atrofdagi salonlar va ustalarni xaritada toping." },
    ],
  }),
  component: MapView,
});

type SalonMapProps = {
  markers: SalonMapMarker[];
  activeId: string;
  onMarkerClick: (id: string) => void;
  showUserLocation: boolean;
  userLocation: { lat: number; lng: number } | null;
  onMapReady?: (handle: SalonMapHandle) => void;
  autoFitMarkers?: boolean;
};

function MapCanvas({
  markers,
  activeId,
  onMarkerClick,
  showUserLocation,
  userLocation,
  onMapReady,
  autoFitMarkers,
}: SalonMapProps) {
  return (
    <MapErrorBoundary>
      <SalonMap
        markers={markers}
        activeId={activeId || null}
        onMarkerClick={onMarkerClick}
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
  const { audience, profileDefault } = useAudience();
  const mapAudience = useMemo(() => {
    if (audience !== "all") return audience;
    return resolveMapAudienceFilter(profileDefault);
  }, [audience, profileDefault]);
  const { data: me } = useMe();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: listSalons = [], isLoading: listLoading } = useSalonsList();

  const ctx = useMemo(() => userRecommendContext(me), [me]);

  const userLocation = useMemo(() => {
    if (ctx.lat == null || ctx.lng == null) return null;
    if (!hasValidMapCoords(ctx.lat, ctx.lng)) return null;
    return { lat: ctx.lat, lng: ctx.lng };
  }, [ctx.lat, ctx.lng]);

  const baseSalons = useMemo(
    () => rankSalonsForUser(listSalons, ctx),
    [listSalons, ctx],
  );

  const salonsWithCoords = useMemo(
    () => baseSalons.filter((s) => hasValidMapCoords(s.lat, s.lng)),
    [baseSalons],
  );

  const [active, setActive] = useState("");
  const [query, setQuery] = useState("");
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [desktopMapExpanded, setDesktopMapExpanded] = useState(false);
  const [mapHandle, setMapHandle] = useState<SalonMapHandle | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapHandleRef = useRef<SalonMapHandle | null>(null);

  const getMapHandle = useCallback(() => mapHandleRef.current, []);

  const onDesktopMapReady = useCallback((handle: SalonMapHandle) => {
    mapHandleRef.current = handle;
    setMapHandle(handle);
    setMapReady(true);
    const resize = () => handle.resize();
    resize();
    [50, 200, 500].forEach((ms) => window.setTimeout(resize, ms));
  }, []);

  const expandDesktopMap = useCallback(() => {
    setDesktopMapExpanded(true);
  }, []);

  const collapseDesktopMap = useCallback(() => {
    setDesktopMapExpanded(false);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return salonsWithCoords.filter((s) => {
      if (!salonMatchesMapAudience(s, mapAudience)) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q);
    });
  }, [query, salonsWithCoords, mapAudience]);

  useEffect(() => {
    if (!active && filtered[0]) setActive(filtered[0].id);
    if (active && !filtered.some((s) => s.id === active)) {
      setActive(filtered[0]?.id ?? "");
    }
  }, [filtered, active]);

  const mapMarkers = useMemo((): SalonMapMarker[] => {
    return filtered.map((s) => ({
      id: s.id,
      lat: s.lat,
      lng: s.lng,
      label: s.name,
      priceLabel:
        s.priceFrom > 0
          ? shortPrice(s.priceFrom)
          : s.rating > 0
            ? `★ ${s.rating.toFixed(1)}`
            : s.name.split(" ")[0].slice(0, 10),
    }));
  }, [filtered]);

  const focusSalon = (id: string) => {
    setActive(id);
  };

  useEffect(() => {
    if (mapMarkers.length === 0) return;
    const fit = () => mapHandleRef.current?.fitMarkers(mapMarkers, { bottom: 48 });
    fit();
    const delays = [120, 400, 800].map((ms) => window.setTimeout(fit, ms));
    return () => delays.forEach((id) => window.clearTimeout(id));
  }, [mapHandle, mapMarkers]);

  useEffect(() => {
    const handle = mapHandleRef.current;
    if (!handle) return;
    const resize = () => handle.resize();
    resize();
    const delays = [50, 150, 350, 600].map((ms) => window.setTimeout(resize, ms));
    return () => delays.forEach((id) => window.clearTimeout(id));
  }, [desktopMapExpanded]);

  useEffect(() => {
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
    : mapAudience === "men"
      ? t("map.emptyMen")
      : mapAudience === "women"
        ? t("map.emptyWomen")
        : t("map.empty");

  const sharedMapProps: SalonMapProps = {
    markers: mapMarkers,
    activeId: active,
    onMarkerClick: focusSalon,
    showUserLocation: !sheetExpanded,
    userLocation,
  };

  return (
    <>
      {/* Mobile: full-screen map + bottom sheet */}
      <div className="relative h-full min-h-0 overflow-hidden bg-surface lg:hidden">
        <div className="absolute inset-0">
          {mounted ? (
            <MapCanvas {...sharedMapProps} autoFitMarkers />
          ) : (
            <div className="h-full w-full bg-surface" />
          )}
        </div>

        {listLoading && filtered.length === 0 ? (
          <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-[22px] border-t border-border/50 bg-background p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground">{t("map.loading")}</p>
          </div>
        ) : null}

        {!listLoading && filtered.length === 0 ? (
          <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-[22px] border-t border-border/50 bg-background p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : null}

        {filtered.length > 0 && active ? (
          <MapSalonSheet
            salons={filtered}
            activeId={active}
            onActiveChange={focusSalon}
            query={query}
            onQueryChange={setQuery}
            onExpandedChange={setSheetExpanded}
          />
        ) : null}
      </div>

      {/* Desktop */}
      <div className="relative hidden h-full w-full min-h-0 lg:flex">
        {!desktopMapExpanded ? (
          <MapDesktopPanel
            salons={filtered}
            activeId={active}
            query={query}
            onQueryChange={setQuery}
            loading={listLoading}
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
              onMapReady={onDesktopMapReady}
              autoFitMarkers
            />
          ) : (
            <div className="h-full w-full bg-surface" />
          )}
        </MapDesktopMapFrame>
      </div>
    </>
  );
}
