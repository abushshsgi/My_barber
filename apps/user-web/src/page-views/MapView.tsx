"use client";

import { Suspense, lazy, useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { StarRating } from "@/components/StarRating";
import { MapPin, ArrowRight, Loader2, Crosshair, Radar, MessageCircle } from "lucide-react";
import { Link, useRouter } from "@/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { mediaSrc, PLACEHOLDER_AVATAR } from "@/lib/media";
import { mapSalonListApi, type SalonListApi } from "@/lib/mapSalon";
import type { Salon } from "@/types";
import type { BarberOnMap } from "./MapInner";

const MapInner = lazy(() => import("./MapInner"));

const DEFAULT_CENTER = { lat: 41.3111, lng: 69.2797 };
const MAP_ZOOM = 14;

const radiusOptions = [1, 2, 3] as const;

type NearbySalonRow = { salon: SalonListApi; distance_km: number };

export type SalonOnMap = Salon & { distance: number };

type BarberNearbyApi = {
  id: number;
  barber_id: number;
  name: string;
  latitude: string | null;
  longitude: string | null;
  avatar: string | null;
  distance_km: number;
};

async function fetchNearbySalons(
  lat: number,
  lng: number,
  radius: number
): Promise<SalonOnMap[]> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius_km: String(radius),
  });
  const res = await apiFetch(`/api/v1/salons/nearby/?${params}`);
  if (!res.ok) throw new Error("Salonlar yuklanmadi");
  const rows = (await res.json()) as NearbySalonRow[];
  return rows.map((r) => {
    const s = mapSalonListApi(r.salon);
    return { ...s, distance: r.distance_km };
  });
}

function mapBarberNearby(r: BarberNearbyApi): BarberOnMap {
  const avatar = mediaSrc(r.avatar, PLACEHOLDER_AVATAR);
  return {
    profileId: r.id,
    barberId: r.barber_id,
    name: r.name?.trim() || "Barber",
    lat: parseFloat(r.latitude ?? "0") || 0,
    lng: parseFloat(r.longitude ?? "0") || 0,
    distance: r.distance_km,
    avatarUrl: avatar,
  };
}

async function fetchNearbyBarbers(
  lat: number,
  lng: number,
  radius: number
): Promise<BarberOnMap[]> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius_km: String(radius),
  });
  const res = await apiFetch(`/api/v1/barbers/nearby/?${params}`);
  if (!res.ok) throw new Error("Barberlar yuklanmadi");
  const rows = (await res.json()) as BarberNearbyApi[];
  return rows.map(mapBarberNearby);
}

export default function MapView() {
  const router = useRouter();
  const [radius, setRadius] = useState<number>(2);
  const [selectedSalon, setSelectedSalon] = useState<string | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>(DEFAULT_CENTER);
  const [geoHint, setGeoHint] = useState<"pending" | "ok" | "fallback">("pending");
  const [flyMe, setFlyMe] = useState(0);
  const canRenderMap = typeof window !== "undefined";

  const refreshLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoHint("fallback");
      return;
    }
    setGeoHint("pending");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoHint("ok");
        setFlyMe((n) => n + 1);
      },
      () => {
        setGeoHint("fallback");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
    );
  }, []);

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  const lat = coords.lat;
  const lng = coords.lng;

  const { data: salons = [], isLoading: loadingSalons } = useQuery({
    queryKey: ["nearby", "salons", lat, lng, radius],
    queryFn: () => fetchNearbySalons(lat, lng, radius),
  });

  const { data: barbers = [], isLoading: loadingBarbers } = useQuery({
    queryKey: ["nearby", "barbers", lat, lng, radius],
    queryFn: () => fetchNearbyBarbers(lat, lng, radius),
  });

  const loading = loadingSalons || loadingBarbers;

  const selectedSalonObj = salons.find((s) => s.id === selectedSalon);
  const selectedBarberObj = barbers.find((b) => b.barberId === selectedBarberId);

  /** Salon/barber faqat ro‘yxatga kiritilgan haqiqiy koordinatalarda — radius sizdan masofaga qarab */
  const salonsOnMap = useMemo(
    () =>
      salons.filter(
        (s) =>
          Number.isFinite(s.lat) &&
          Number.isFinite(s.lng) &&
          !(Math.abs(s.lat) < 0.02 && Math.abs(s.lng) < 0.02)
      ),
    [salons]
  );
  const barbersOnMap = useMemo(
    () =>
      barbers.filter(
        (b) =>
          Number.isFinite(b.lat) &&
          Number.isFinite(b.lng) &&
          !(Math.abs(b.lat) < 0.02 && Math.abs(b.lng) < 0.02)
      ),
    [barbers]
  );

  const centerTuple = useMemo((): [number, number] => [lat, lng], [lat, lng]);

  const sheetBottom =
    "bottom-[calc(3.75rem+env(safe-area-inset-bottom))] sm:bottom-[calc(4rem+env(safe-area-inset-bottom))]";

  return (
    <div className="min-h-[100dvh] min-h-screen flex flex-col bg-background">
      <header className="shrink-0 z-[1000] px-2.5 sm:px-4 pt-[max(0.35rem,env(safe-area-inset-top))] pb-1.5 sm:pb-2">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1.5 sm:space-y-2 max-w-lg mx-auto"
        >
          <div className="rounded-xl sm:rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-lg overflow-hidden">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 border-b border-border/40">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                <Radar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-semibold text-foreground leading-tight">
                  Qidiruv radiusi
                </p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug line-clamp-2 sm:line-clamp-none">
                  Ro‘yxatdagi manzillar;{" "}
                  <span className="text-accent font-medium">{radius} km</span> ichida
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  refreshLocation();
                }}
                className="inline-flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-accent text-accent-foreground text-[10px] sm:text-xs font-semibold shadow shrink-0"
              >
                <Crosshair className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Men
              </button>
            </div>
            <div className="p-1 sm:p-1.5 grid grid-cols-3 gap-1">
              {radiusOptions.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadius(r)}
                  className={`flex flex-col items-center justify-center py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-[0.98] ${
                    radius === r
                      ? "bg-accent text-accent-foreground shadow-sm ring-1 ring-accent/50 ring-offset-1 ring-offset-card"
                      : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="text-base sm:text-lg leading-none">{r}</span>
                  <span className="text-[9px] sm:text-[10px] font-medium opacity-90 mt-px">km</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-1.5 flex-wrap justify-end min-h-[1.25rem]">
            {geoHint === "pending" && (
              <span className="text-[10px] sm:text-[11px] text-muted-foreground bg-card/90 px-1.5 py-0.5 rounded-md border border-border/50">
                Joylashuv…
              </span>
            )}
            {geoHint === "fallback" && (
              <span className="text-[10px] sm:text-[11px] text-amber-500/90 bg-card/90 px-1.5 py-0.5 rounded-md border border-border/50 max-w-[min(100%,18rem)] leading-snug">
                GPS yo‘q — Toshkent markazi. «Men» yoki ruxsat.
              </span>
            )}
            {geoHint === "ok" && (
              <span className="text-[10px] sm:text-[11px] text-emerald-500/90 bg-card/90 px-1.5 py-0.5 rounded-md border border-emerald-500/20 max-w-[min(100%,20rem)] leading-snug">
                GPS bo‘yicha atrofdagi salon va barberlar.
              </span>
            )}
          </div>
        </motion.div>
      </header>

      <div className="flex-1 min-h-0 px-2 sm:px-3 pb-1 flex flex-col">
        <div className="flex-1 min-h-[min(40vh,200px)] relative rounded-xl overflow-hidden border border-border/40 shadow-inner bg-muted/20">
          {loading && (
            <div className="absolute inset-0 z-[500] flex items-center justify-center bg-background/35 pointer-events-none rounded-xl">
              <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 animate-spin text-accent" />
            </div>
          )}
          {canRenderMap ? (
            <Suspense
              fallback={<div className="h-full min-h-[200px] bg-muted animate-pulse rounded-xl" />}
            >
              <MapInner
                center={centerTuple}
                userPosition={centerTuple}
                radiusKm={radius}
                salons={salonsOnMap}
                barbers={barbersOnMap}
                onSelectSalon={(id) => {
                  setSelectedSalon(id);
                  if (id) setSelectedBarberId(null);
                }}
                onSelectBarber={(bid) => {
                  setSelectedBarberId(bid);
                  if (bid != null) setSelectedSalon(null);
                }}
                flyToMeTrigger={flyMe}
                mapZoom={MAP_ZOOM}
              />
            </Suspense>
          ) : (
            <div className="h-full min-h-[200px] bg-muted rounded-xl" />
          )}
        </div>
      </div>

      <p className="shrink-0 text-[9px] sm:text-[10px] text-center text-muted-foreground px-3 pb-1 pt-0.5 leading-tight">
        Doira <span className="text-accent font-medium">{radius} km</span> • Salon{" "}
        <span className="text-teal-400">●</span> • Barber <span className="text-amber-400">●</span> • Siz{" "}
        <span className="text-blue-400">●</span>
      </p>

      <AnimatePresence>
        {selectedSalonObj && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={`fixed left-3 right-3 sm:left-4 sm:right-4 z-[1001] ${sheetBottom}`}
          >
            <div className="bg-card rounded-xl sm:rounded-2xl shadow-xl border border-border p-3 sm:p-3.5">
              <div className="flex gap-2 sm:gap-3">
                <img
                  src={selectedSalonObj.coverImage}
                  alt={selectedSalonObj.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-bold truncate leading-tight">
                    {selectedSalonObj.name}
                  </h3>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Salon</p>
                  <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1 flex-wrap">
                    <StarRating rating={selectedSalonObj.rating} size="sm" />
                    <span className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {selectedSalonObj.distance.toFixed(1)} km
                    </span>
                  </div>
                </div>
              </div>
              <Link
                href={`/salon/${selectedSalonObj.id}`}
                className="mt-2 sm:mt-2.5 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg sm:rounded-xl bg-accent text-accent-foreground text-xs sm:text-sm font-semibold"
              >
                Salonni ochish <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedBarberObj && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={`fixed left-3 right-3 sm:left-4 sm:right-4 z-[1001] ${sheetBottom}`}
          >
            <div className="bg-card rounded-xl sm:rounded-2xl shadow-xl border border-border p-3 sm:p-3.5">
              <div className="flex gap-2 sm:gap-3">
                <img
                  src={selectedBarberObj.avatarUrl}
                  alt={selectedBarberObj.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl object-cover ring-2 ring-amber-500/40 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-bold truncate leading-tight">
                    {selectedBarberObj.name}
                  </h3>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Mustaqil barber</p>
                  <span className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5 sm:mt-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {selectedBarberObj.distance.toFixed(1)} km
                  </span>
                </div>
              </div>
              <Link
                href={`/booking/barber/${selectedBarberObj.barberId}`}
                className="mt-2 sm:mt-2.5 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg sm:rounded-xl bg-amber-600 text-white text-xs sm:text-sm font-semibold"
              >
                Bron qilish <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Link>
              <button
                type="button"
                onClick={async () => {
                  const res = await apiFetch("/api/v1/chat/conversations/", {
                    method: "POST",
                    body: JSON.stringify({ barber_id: selectedBarberObj.barberId }),
                  });
                  if (!res.ok) return;
                  const convo = (await res.json()) as { id: string };
                  router.push(`/chat/${convo.id}`);
                }}
                className="mt-2 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg sm:rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold"
              >
                Chat <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
