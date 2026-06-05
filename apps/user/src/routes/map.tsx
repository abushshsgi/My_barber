import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type L from "leaflet";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
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
import { salons, shortPrice } from "@/lib/mock-data";
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

const SNAPS = { peek: 160, half: 380, full: 640 };

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
  const [active, setActive] = useState(salons[0].id);
  const [query, setQuery] = useState("");
  const [heatmap, setHeatmap] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [flyToUser, setFlyToUser] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return salons;
    const q = query.toLowerCase();
    return salons.filter(
      (s) => s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q),
    );
  }, [query]);

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

  const y = useMotionValue(0);
  const sheetH = useTransform(y, (v) => `${Math.max(SNAPS.peek, SNAPS.half - v)}px`);
  const snapTo = (target: "peek" | "half" | "full") => {
    const delta = SNAPS.half - SNAPS[target];
    animate(y, delta, { type: "spring", stiffness: 300, damping: 34 });
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
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 220px)" }}
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
        drag="y"
        dragConstraints={{ top: -(SNAPS.full - SNAPS.half), bottom: SNAPS.half - SNAPS.peek }}
        dragElastic={0.05}
        style={{ y, height: sheetH }}
        onDragEnd={(_, info) => {
          const v = y.get();
          if (info.velocity.y < -500) snapTo("full");
          else if (info.velocity.y > 500) snapTo("peek");
          else if (v < -(SNAPS.full - SNAPS.half) / 2) snapTo("full");
          else if (v > (SNAPS.half - SNAPS.peek) / 2) snapTo("peek");
          else snapTo("half");
        }}
        className="absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-3xl bg-background shadow-2xl"
      >
        <div
          className="flex shrink-0 cursor-grab flex-col items-center pt-3 pb-2 active:cursor-grabbing"
          onClick={() => snapTo(y.get() < 0 ? "half" : "full")}
        >
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          <div className="mt-2 flex w-full items-center justify-between px-5">
            <div>
              <h3 className="text-[15px] font-bold" suppressHydrationWarning>
                {filtered.length}{" "}
                {mounted
                  ? (t(tab === "salons" ? "map.salons" : "map.barbers") as string)
                  : tab === "salons"
                    ? "Salonlar"
                    : "Ustalar"}
              </h3>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {t("map.nearby")}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cycle(-1);
                }}
                className="grid h-8 w-8 place-items-center rounded-full bg-surface active:scale-95"
                aria-label="Prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cycle(1);
                }}
                className="grid h-8 w-8 place-items-center rounded-full bg-surface active:scale-95"
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  snapTo("full");
                }}
                className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background active:scale-95"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="no-scrollbar flex shrink-0 gap-3 overflow-x-auto px-4 pb-3 pt-1 snap-x snap-mandatory"
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
                  "snap-center flex w-[240px] shrink-0 items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                  isActive
                    ? "border-foreground bg-surface scale-[1.02] shadow-md"
                    : "border-border bg-background",
                )}
              >
                <div
                  className="h-12 w-12 shrink-0 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, oklch(0.85 0.04 ${(Number(s.id) * 80) % 360}), oklch(0.55 0.06 ${(Number(s.id) * 80 + 50) % 360}))`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-bold">{s.name}</h4>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold">
                    <Star className="h-3 w-3 fill-foreground" strokeWidth={0} />
                    {s.rating}
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{s.distanceKm} km</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div
          className="flex-1 overflow-y-auto border-t border-border px-4 pt-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 100px)" }}
        >
          {filtered.map((s) => {
            const isActive = s.id === active;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => focusSalon(s.id)}
                className={cn(
                  "mb-2 flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                  isActive ? "border-foreground bg-surface" : "border-border bg-background active:bg-surface",
                )}
              >
                <div
                  className="h-14 w-14 shrink-0 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, oklch(0.85 0.04 ${(Number(s.id) * 80) % 360}), oklch(0.55 0.06 ${(Number(s.id) * 80 + 50) % 360}))`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-bold">{s.name}</h4>
                  <p className="truncate text-[11px] font-medium text-muted-foreground">{s.address}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] font-bold">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-foreground" strokeWidth={0} />
                      {s.rating}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span>{s.distanceKm} km</span>
                    <span className="text-muted-foreground">·</span>
                    <span>{shortPrice(s.priceFrom)}+</span>
                  </div>
                </div>
                <Link
                  to="/salon/$id"
                  params={{ id: s.id }}
                  onClick={(e) => e.stopPropagation()}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background active:scale-95"
                >
                  <Navigation className="h-3.5 w-3.5" />
                </Link>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
