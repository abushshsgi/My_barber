import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type L from "leaflet";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MapAirbnbCarousel } from "@/components/map/MapAirbnbCarousel";
import { SalonMap, type SalonMapMarker } from "@/components/map/SalonMap";
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

function MapView() {
  const { t } = useTranslation();
  const { profileDefault } = useAudience();
  const mapAudience = useMemo(() => resolveMapAudienceFilter(profileDefault), [profileDefault]);
  const { data: me } = useMe();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const mapRef = useRef<L.Map | null>(null);
  const { data: listSalons = [], isLoading: listLoading } = useSalonsList();
  const [allSalonsOpen, setAllSalonsOpen] = useState(false);

  const ctx = useMemo(() => userRecommendContext(me), [me]);

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

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-surface">
      <div className="absolute inset-0">
        {mounted ? (
          <SalonMap
            markers={mapMarkers}
            activeId={active || null}
            onMarkerClick={focusSalon}
            showUserLocation={!allSalonsOpen}
            onMapReady={(map) => {
              mapRef.current = map;
            }}
          />
        ) : (
          <div className="h-full w-full bg-surface" />
        )}
      </div>

      {!allSalonsOpen ? (
        <div
          className="absolute inset-x-0 top-0 z-40 flex justify-center px-4"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}
        >
          <div className="relative w-full max-w-md rounded-full border border-border/50 bg-background/98 py-2.5 pl-10 pr-4 shadow-[0_4px_20px_rgba(0,0,0,0.12)] backdrop-blur-md">
            <Search
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={2.4}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mounted ? (t("map.search") as string) : "Salon yoki manzil"}
              className="w-full bg-transparent text-[13px] font-semibold placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>
      ) : null}

      {listLoading && filtered.length === 0 ? (
        <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border/50 bg-background p-4 text-center">
          <p className="text-sm font-medium text-muted-foreground">{t("map.loading")}</p>
        </div>
      ) : null}

      {!listLoading && filtered.length === 0 ? (
        <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border/50 bg-background p-4 text-center">
          <p className="text-sm font-medium text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : null}

      {filtered.length > 0 && active ? (
        <MapAirbnbCarousel
          salons={filtered}
          activeId={active}
          onActiveChange={focusSalon}
          onAllSalonsOpenChange={setAllSalonsOpen}
          query={query}
          onQueryChange={setQuery}
        />
      ) : null}
    </div>
  );
}
