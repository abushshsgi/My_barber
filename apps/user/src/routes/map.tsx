import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type L from "leaflet";
import { Search, Locate } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MapSalonBottomPanel } from "@/components/map/MapSalonBottomPanel";
import { MapSalonListSheet } from "@/components/map/MapSalonListSheet";
import { SalonMap, type SalonMapMarker } from "@/components/map/SalonMap";
import { resolveMapAudienceFilter, useAudience } from "@/hooks/use-audience";
import { useMe } from "@/hooks/use-me";
import { useSalonsList, useSalonsNearby } from "@/hooks/use-salons";
import { getSalonCoverUrl } from "@/lib/cover-images";
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

function MapView() {
  const { t } = useTranslation();
  const { profileDefault } = useAudience();
  const mapAudience = useMemo(() => resolveMapAudienceFilter(profileDefault), [profileDefault]);
  const { data: me } = useMe();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const locateAttemptedRef = useRef(false);
  const mapRef = useRef<L.Map | null>(null);
  const { data: listSalons = [], isLoading: listLoading } = useSalonsList();
  const { data: nearbySalons = [], isLoading: nearbyLoading } = useSalonsNearby(
    userLocation?.lat,
    userLocation?.lng,
  );

  const ctx = useMemo(() => userRecommendContext(me), [me]);
  const hasCoords = userLocation != null;

  const baseSalons = useMemo(() => {
    const raw = hasCoords && nearbySalons.length > 0 ? nearbySalons : listSalons;
    return rankSalonsForUser(raw, ctx);
  }, [hasCoords, nearbySalons, listSalons, ctx]);

  const salonsWithCoords = useMemo(
    () => baseSalons.filter((s) => hasValidMapCoords(s.lat, s.lng)),
    [baseSalons],
  );

  const [active, setActive] = useState("");
  const [query, setQuery] = useState("");
  const [flyToUser, setFlyToUser] = useState<{ lat: number; lng: number } | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [cardExpanded, setCardExpanded] = useState(false);

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

  const activeSalon = filtered.find((s) => s.id === active);
  const activeIndex = filtered.findIndex((s) => s.id === active);

  const mapMarkers = useMemo((): SalonMapMarker[] => {
    return filtered.map((s) => ({
      id: s.id,
      lat: s.lat,
      lng: s.lng,
      label: s.name,
      coverUrl: s.coverUrl ?? getSalonCoverUrl(s.coverSeed),
    }));
  }, [filtered]);

  const focusSalon = (id: string, expand = false) => {
    setActive(id);
    if (expand) setCardExpanded(true);
  };

  const cycle = (dir: 1 | -1) => {
    if (filtered.length === 0) return;
    const idx = filtered.findIndex((s) => s.id === active);
    const next = filtered[(idx + dir + filtered.length) % filtered.length];
    focusSalon(next.id);
  };

  const locateMe = (silent = false) => {
    if (!navigator.geolocation) {
      if (!silent) toast.error(t("map.locateUnsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setFlyToUser(loc);
      },
      () => {
        if (!silent) toast.error(t("map.locateError"));
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  useEffect(() => {
    if (!mounted || locateAttemptedRef.current) return;
    locateAttemptedRef.current = true;
    locateMe(true);
  }, [mounted]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const timer = window.setTimeout(() => map.invalidateSize(), 350);
    return () => window.clearTimeout(timer);
  }, [cardExpanded]);

  const isLoading = listLoading || (hasCoords && nearbyLoading);
  const emptyMessage = query.trim()
    ? t("map.emptySearch")
    : mapAudience === "men"
      ? t("map.emptyMen")
      : mapAudience === "women"
        ? t("map.emptyWomen")
        : t("map.empty");

  const audienceHintKey =
    mapAudience === "men" ? "map.forMen" : mapAudience === "women" ? "map.forWomen" : null;

  return (
    <div className="flex h-[calc(100dvh-68px-env(safe-area-inset-bottom,0px))] flex-col overflow-hidden bg-surface lg:h-[100dvh]">
      <div className="relative min-h-0 flex-1 transition-[flex-grow] duration-300 ease-out">
        <div className="absolute inset-0">
          {mounted ? (
            <SalonMap
              markers={mapMarkers}
              activeId={active || null}
              onMarkerClick={(id) => focusSalon(id, true)}
              userLocation={userLocation}
              flyToUser={flyToUser}
              onMapReady={(map) => {
                mapRef.current = map;
              }}
            />
          ) : (
            <div className="h-full w-full bg-surface" />
          )}
        </div>

        <div
          className="absolute inset-x-0 top-0 z-20 px-4"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
        >
          <div className="rounded-2xl bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2.4} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={mounted ? (t("map.search") as string) : "Salon yoki manzil"}
                className="flex-1 bg-transparent text-sm font-medium placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            {audienceHintKey && mounted ? (
              <p className="mt-1.5 text-[10px] font-bold text-muted-foreground">{t(audienceHintKey)}</p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => locateMe()}
          className="absolute right-4 z-20 grid h-11 w-11 place-items-center rounded-full border border-border/50 bg-background/95 text-foreground shadow-lg backdrop-blur-sm active:scale-95"
          style={{ bottom: 16 }}
          aria-label={t("map.locate")}
        >
          <Locate className="h-5 w-5" />
        </button>
      </div>

      {isLoading && filtered.length === 0 ? (
        <div className="shrink-0 border-t border-border/50 bg-background p-4 text-center">
          <p className="text-sm font-medium text-muted-foreground">{t("map.loading")}</p>
        </div>
      ) : null}

      {!isLoading && filtered.length === 0 ? (
        <div className="shrink-0 border-t border-border/50 bg-background p-4 text-center">
          <p className="text-sm font-medium text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : null}

      {filtered.length > 0 && activeSalon ? (
        <MapSalonBottomPanel
          salon={activeSalon}
          index={activeIndex}
          total={filtered.length}
          expanded={cardExpanded}
          onToggle={() => setCardExpanded((v) => !v)}
          onPrev={() => cycle(-1)}
          onNext={() => cycle(1)}
          onSwipe={cycle}
          canPrev={filtered.length > 1}
          canNext={filtered.length > 1}
          onListOpen={() => setListOpen(true)}
        />
      ) : null}

      <MapSalonListSheet
        open={listOpen}
        salons={filtered}
        activeId={active}
        onClose={() => setListOpen(false)}
        onSelect={(id) => focusSalon(id, true)}
      />
    </div>
  );
}
