import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Locate } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MapAudienceChips } from "@/components/map/MapAudienceChips";
import { MapSalonCard } from "@/components/map/MapSalonCard";
import { MapSalonListSheet, MapSalonListToggle } from "@/components/map/MapSalonListSheet";
import { SalonMap, type SalonMapMarker } from "@/components/map/SalonMap";
import { matchAudience, useAudience } from "@/hooks/use-audience";
import { useMe } from "@/hooks/use-me";
import { useSalonsList, useSalonsNearby } from "@/hooks/use-salons";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { hasValidMapCoords } from "@/lib/map-utils";
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
  const { audience } = useAudience();
  const { data: me } = useMe();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const locateAttemptedRef = useRef(false);
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return salonsWithCoords.filter((s) => {
      if (!matchAudience(s.audience, audience)) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q);
    });
  }, [query, salonsWithCoords, audience]);

  useEffect(() => {
    if (!active && filtered[0]) setActive(filtered[0].id);
    if (active && !filtered.some((s) => s.id === active)) {
      setActive(filtered[0]?.id ?? "");
    }
  }, [filtered, active]);

  const activeSalon = filtered.find((s) => s.id === active);

  const mapMarkers = useMemo((): SalonMapMarker[] => {
    return filtered.map((s) => ({
      id: s.id,
      lat: s.lat,
      lng: s.lng,
      label: s.name,
      coverUrl: s.coverUrl ?? getSalonCoverUrl(s.coverSeed),
    }));
  }, [filtered]);

  const activeIndex = filtered.findIndex((s) => s.id === active);

  const focusSalon = (id: string) => {
    setActive(id);
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

  const isLoading = listLoading || (hasCoords && nearbyLoading);
  const emptyMessage = query.trim() ? t("map.emptySearch") : t("map.empty");

  return (
    <div className="relative h-[calc(100dvh-68px-env(safe-area-inset-bottom,0px))] overflow-hidden bg-surface lg:h-[100dvh]">
      <div className="absolute inset-0 z-0">
        {mounted ? (
          <SalonMap
            markers={mapMarkers}
            activeId={active || null}
            onMarkerClick={focusSalon}
            userLocation={userLocation}
            flyToUser={flyToUser}
          />
        ) : (
          <div className="h-full w-full bg-surface" />
        )}
      </div>

      <div
        className="absolute inset-x-0 top-0 z-20 px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
      >
        <div className="flex items-center gap-2 rounded-full bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm">
          <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2.4} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mounted ? (t("map.search") as string) : "Salon yoki manzil"}
            className="flex-1 bg-transparent text-sm font-medium placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div className="mt-2 rounded-2xl bg-background/95 px-2 py-2 shadow-md backdrop-blur-sm">
          <MapAudienceChips />
        </div>
      </div>

      <button
        type="button"
        onClick={() => locateMe()}
        className="absolute right-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-foreground text-background shadow-lg active:scale-95"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 248px)" }}
        aria-label={t("map.locate")}
      >
        <Locate className="h-5 w-5" />
      </button>

      <div
        className="absolute inset-x-0 bottom-0 z-30 px-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
      >
        {isLoading && filtered.length === 0 ? (
          <div className="rounded-2xl bg-background/98 p-4 text-center shadow-lg backdrop-blur-md">
            <p className="text-sm font-medium text-muted-foreground">{t("map.loading")}</p>
          </div>
        ) : null}

        {!isLoading && filtered.length === 0 ? (
          <div className="rounded-2xl bg-background/98 p-4 text-center shadow-lg backdrop-blur-md">
            <p className="text-sm font-medium text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : null}

        {filtered.length > 0 ? (
          <>
            <MapSalonListToggle count={filtered.length} onClick={() => setListOpen(true)} />
            {activeSalon ? (
              <MapSalonCard
                salon={activeSalon}
                onPrev={() => cycle(-1)}
                onNext={() => cycle(1)}
                onSwipe={cycle}
                canPrev={filtered.length > 1}
                canNext={filtered.length > 1}
              />
            ) : null}
          </>
        ) : null}
      </div>

      <MapSalonListSheet
        open={listOpen}
        salons={filtered}
        activeId={active}
        onClose={() => setListOpen(false)}
        onSelect={focusSalon}
      />
    </div>
  );
}
