import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type L from "leaflet";
import { motion, useMotionValue, animate, type PanInfo } from "framer-motion";
import {
  Star,
  SlidersHorizontal,
  Search,
  Navigation,
  Locate,
  ChevronUp,
  Compass,
  Flame,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { fitMapToMarkers, SalonMap, type SalonMapMarker } from "@/components/map/SalonMap";
import { useSalonsList, useSalonsNearby } from "@/hooks/use-salons";
import { shortPrice } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Xarita — mysaloon.uz" },
      { name: "description", content: "Yaqin atrofdagi salonlar va ustalarni xaritada toping." },
    ],
  }),
  component: MapView,
});

const SNAPS = { peek: 86, half: 210, full: 460 };
type SheetSnap = keyof typeof SNAPS;

function nearestSnap(height: number): SheetSnap {
  const entries = Object.entries(SNAPS) as [SheetSnap, number][];
  return entries.reduce((best, [key, value]) =>
    Math.abs(height - value) < Math.abs(height - SNAPS[best]) ? key : best,
  entries[0][0]);
}

function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km <= 0) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

function barberOffset(id: string, index: number) {
  const h = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return {
    dLat: (((h + index * 7) % 9) - 4) * 0.00035,
    dLng: (((h + index * 11) % 9) - 4) * 0.00035,
  };
}

function MapView() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [tab, setTab] = useState<"salons" | "barbers">("salons");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { data: listSalons = [] } = useSalonsList();
  const { data: nearbySalons = [] } = useSalonsNearby(
    userLocation?.lat,
    userLocation?.lng,
  );
  const salons = nearbySalons.length > 0 ? nearbySalons : listSalons;
  const [active, setActive] = useState("");
  useEffect(() => {
    if (!active && salons[0]) setActive(salons[0].id);
  }, [salons, active]);
  const [query, setQuery] = useState("");
  const [heatmap, setHeatmap] = useState(false);
  const [flyToUser, setFlyToUser] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return salons;
    const q = query.toLowerCase();
    return salons.filter(
      (s) => s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q),
    );
  }, [query, salons]);

  const mapMarkers = useMemo((): SalonMapMarker[] => {
    if (tab === "salons") {
      return filtered.map((s) => ({
        id: s.id,
        lat: s.lat,
        lng: s.lng,
        label: s.name,
        kind: "salon",
      }));
    }
    return filtered.flatMap((s) =>
      s.staff.map((b, i) => {
        const { dLat, dLng } = barberOffset(b.id, i);
        return {
          id: b.id,
          lat: s.lat + dLat,
          lng: s.lng + dLng,
          label: b.name,
          kind: "barber" as const,
        };
      }),
    );
  }, [filtered, tab]);

  const activeMarkerId = useMemo(() => {
    if (tab === "salons") return active;
    const salon = filtered.find((s) => s.id === active);
    return salon?.staff[0]?.id ?? null;
  }, [tab, active, filtered]);

  const sheetHeight = useMotionValue<number>(SNAPS.peek);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("peek");
  const dragStartHeight = useRef(SNAPS.peek);

  const snapTo = (target: SheetSnap) => {
    setSheetSnap(target);
    animate(sheetHeight, SNAPS[target], {
      type: "spring",
      stiffness: 420,
      damping: 38,
      mass: 0.85,
    });
  };

  const onSheetPanStart = () => {
    dragStartHeight.current = sheetHeight.get();
  };

  const onSheetPan = (_: unknown, info: PanInfo) => {
    const next = dragStartHeight.current - info.offset.y;
    sheetHeight.set(Math.min(SNAPS.full, Math.max(SNAPS.peek, next)));
  };

  const onSheetPanEnd = (_: unknown, info: PanInfo) => {
    const current = sheetHeight.get();
    if (info.velocity.y < -450) snapTo("full");
    else if (info.velocity.y > 450) snapTo("peek");
    else snapTo(nearestSnap(current));
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const focusSalon = (id: string) => {
    setActive(id);
    const el = scrollRef.current?.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const onMarkerClick = (id: string) => {
    if (tab === "barbers") {
      const salon = filtered.find((s) => s.staff.some((b) => b.id === id));
      if (salon) focusSalon(salon.id);
      return;
    }
    focusSalon(id);
  };

  const cycle = (dir: 1 | -1) => {
    const idx = filtered.findIndex((s) => s.id === active);
    const next = filtered[(idx + dir + filtered.length) % filtered.length];
    focusSalon(next.id);
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      toast.error(t("map.locateUnsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setFlyToUser(loc);
      },
      () => toast.error(t("map.locateError")),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const fitAllMarkers = () => {
    if (mapRef.current) fitMapToMarkers(mapRef.current, mapMarkers);
  };

  return (
    <div className="relative h-[calc(100dvh-68px-env(safe-area-inset-bottom))] overflow-hidden bg-surface lg:h-[100dvh]">
      <div className="absolute inset-0 z-0">
        {mounted ? (
          <SalonMap
            markers={mapMarkers}
            activeId={activeMarkerId}
            onMarkerClick={onMarkerClick}
            userLocation={userLocation}
            flyToUser={flyToUser}
            heatmap={heatmap}
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
        <div className="flex items-center gap-2 rounded-full bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm">
          <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2.4} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mounted ? (t("map.search") as string) : "Salon yoki manzil"}
            className="flex-1 bg-transparent text-sm font-medium placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-full bg-surface active:scale-95"
            aria-label={t("map.filters")}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex justify-center">
          <div className="relative inline-flex rounded-full bg-background/95 p-1 shadow-md backdrop-blur-sm">
            {(["salons", "barbers"] as const).map((k) => {
              const isActive = tab === k;
              const fallback = k === "salons" ? "Salonlar" : "Ustalar";
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={cn(
                    "relative rounded-full px-6 py-2 text-[12px] font-bold tracking-wide transition-colors",
                    isActive ? "text-background" : "text-foreground",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="map-tab-pill"
                      className="absolute inset-0 rounded-full bg-foreground"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10" suppressHydrationWarning>
                    {mounted ? (t(`map.${k}`) as string) : fallback}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setHeatmap((v) => !v)}
        className={cn(
          "absolute left-4 z-20 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-md backdrop-blur-sm transition-colors",
          heatmap ? "bg-foreground text-background" : "bg-background/95 text-foreground",
        )}
        style={{ top: "calc(env(safe-area-inset-top) + 130px)" }}
      >
        <Flame className="h-3.5 w-3.5" />
        {t("map.heatmap")}
      </button>

      <div
        className="absolute right-4 z-20 flex flex-col gap-2"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 108px)" }}
      >
        <button
          type="button"
          onClick={fitAllMarkers}
          className="grid h-11 w-11 place-items-center rounded-full bg-background/95 shadow-md backdrop-blur-sm active:scale-95"
          aria-label={t("map.fitAll")}
        >
          <Compass className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={locateMe}
          className="grid h-11 w-11 place-items-center rounded-full bg-foreground text-background shadow-lg active:scale-95"
          aria-label={t("map.locate")}
        >
          <Locate className="h-5 w-5" />
        </button>
      </div>

      <motion.div
        style={{ height: sheetHeight }}
        className="absolute inset-x-0 bottom-0 z-30 mx-auto flex max-w-[480px] flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-background/98 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] backdrop-blur-md lg:max-w-[720px]"
      >
        <motion.div
          className="flex shrink-0 touch-none cursor-grab flex-col items-center pt-1.5 pb-0.5 active:cursor-grabbing"
          onPanStart={onSheetPanStart}
          onPan={onSheetPan}
          onPanEnd={onSheetPanEnd}
          onClick={() =>
            snapTo(sheetSnap === "peek" ? "half" : sheetSnap === "half" ? "full" : "peek")
          }
        >
          <div className="h-0.5 w-8 rounded-full bg-muted-foreground/30" />
          <div className="mt-1 flex w-full items-center justify-between gap-2 px-2.5">
            <p className="min-w-0 truncate text-[10px] font-bold text-foreground" suppressHydrationWarning>
              <span className="text-muted-foreground">{filtered.length}</span>{" "}
              {mounted
                ? (t(tab === "salons" ? "map.salons" : "map.barbers") as string)
                : tab === "salons"
                  ? "salon"
                  : "usta"}{" "}
              <span className="font-medium text-muted-foreground">· {t("map.nearby")}</span>
            </p>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cycle(-1);
                }}
                className="grid h-6 w-6 place-items-center rounded-full bg-surface active:scale-95"
                aria-label="Prev"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cycle(1);
                }}
                className="grid h-6 w-6 place-items-center rounded-full bg-surface active:scale-95"
                aria-label="Next"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  snapTo(sheetSnap === "full" ? "peek" : "full");
                }}
                className="grid h-6 w-6 place-items-center rounded-full bg-foreground text-background active:scale-95"
              >
                <ChevronUp
                  className={cn("h-3 w-3 transition-transform duration-200", sheetSnap === "full" && "rotate-180")}
                />
              </button>
            </div>
          </div>
        </motion.div>

        <div
          ref={scrollRef}
          className="no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto px-2.5 pb-1.5 snap-x snap-mandatory"
        >
          {filtered.map((s) => {
            const isActive = s.id === active;
            return (
              <button
                key={s.id}
                type="button"
                data-id={s.id}
                onClick={() => focusSalon(s.id)}
                className={cn(
                  "snap-center flex w-[112px] shrink-0 items-center gap-1.5 rounded-lg border px-1.5 py-1 text-left transition-colors",
                  isActive
                    ? "border-foreground bg-surface shadow-sm"
                    : "border-border/70 bg-background/90",
                )}
              >
                <div
                  className="h-7 w-7 shrink-0 rounded-md"
                  style={{
                    background: `linear-gradient(135deg, oklch(0.85 0.04 ${(Number(s.id) * 80) % 360}), oklch(0.55 0.06 ${(Number(s.id) * 80 + 50) % 360}))`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-[10px] font-bold leading-tight">{s.name}</h4>
                  <div className="mt-px flex items-center gap-0.5 text-[9px] font-semibold text-muted-foreground">
                    <Star className="h-2 w-2 fill-foreground text-foreground" strokeWidth={0} />
                    {s.rating || "—"}
                    <span>·</span>
                    <span>{formatDistanceKm(s.distanceKm)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {sheetSnap !== "peek" ? (
          <div
            className="min-h-0 flex-1 overflow-y-auto border-t border-border/70 px-2.5 pt-1.5"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 72px)" }}
          >
            {filtered.map((s) => {
              const isActive = s.id === active;
              return (
                <button
                  key={`list-${s.id}`}
                  type="button"
                  onClick={() => focusSalon(s.id)}
                  className={cn(
                    "mb-1 flex w-full items-center gap-2 rounded-lg border px-1.5 py-1.5 text-left transition-colors",
                    isActive
                      ? "border-foreground/80 bg-surface"
                      : "border-transparent bg-transparent active:bg-surface/80",
                  )}
                >
                  <div
                    className="h-8 w-8 shrink-0 rounded-md"
                    style={{
                      background: `linear-gradient(135deg, oklch(0.85 0.04 ${(Number(s.id) * 80) % 360}), oklch(0.55 0.06 ${(Number(s.id) * 80 + 50) % 360}))`,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-[11px] font-bold leading-tight">{s.name}</h4>
                    <p className="truncate text-[9px] text-muted-foreground">{s.address || "—"}</p>
                    <div className="mt-px flex items-center gap-1 text-[9px] font-semibold">
                      <span className="flex items-center gap-0.5">
                        <Star className="h-2 w-2 fill-foreground" strokeWidth={0} />
                        {s.rating || "—"}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span>{formatDistanceKm(s.distanceKm)}</span>
                      {s.priceFrom > 0 ? (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span>{shortPrice(s.priceFrom)}+</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <Link
                    to="/salon/$id"
                    params={{ id: s.id }}
                    onClick={(e) => e.stopPropagation()}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foreground text-background active:scale-95"
                  >
                    <Navigation className="h-2.5 w-2.5" />
                  </Link>
                </button>
              );
            })}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
