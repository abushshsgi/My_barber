"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Crosshair, MapPin, Star } from "lucide-react";
import { Link, useRouter } from "@/navigation";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { mediaSrc, PLACEHOLDER_AVATAR, PLACEHOLDER_SALON } from "@/lib/media";
import { mapSalonListApi, type SalonListApi } from "@/lib/mapSalon";
import type { Salon } from "@/types";
import { formatKm } from "@/lib/format";
import { MapView as LuxuryMapView } from "@/components/luxury/MapView";
import { RatingStars } from "@/components/luxury/RatingStars";
import { NeoPage } from "@/components/neo/NeoPrimitives";

const DEFAULT_CENTER = { lat: 41.3111, lng: 69.2797 };

type GeoStatus = "idle" | "loading" | "granted" | "fallback" | "denied";
type NearbySalonRow = { salon: SalonListApi; distance_km: number };
type BarberNearbyApi = {
  id: number;
  barber_id: number;
  name: string;
  latitude: string | null;
  longitude: string | null;
  avatar: string | null;
  distance_km: number;
  booking_kind?: "independent" | "salon" | null;
  salon_id?: number | null;
  salon_name?: string | null;
  avg_rating?: number | null;
  review_count?: number | null;
  active_services?: Array<{ name: string }>;
};

type PremiumBarber = {
  id: string;
  name: string;
  avatar: string;
  salonName: string;
  rating: number;
  reviewCount: number;
  lat: number;
  lng: number;
  distanceKm?: number;
  bookingKind: "independent" | "salon";
  salonId?: string;
};

const RADII = [1, 2, 5, 10, 25] as const;

function hasMapCoords(item: { lat: number; lng: number }): boolean {
  return Number.isFinite(item.lat) && Number.isFinite(item.lng) && !(item.lat === 0 && item.lng === 0);
}

async function fetchNearbySalons(lat: number, lng: number, radius: number): Promise<Salon[]> {
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

function mapBarberNearby(r: BarberNearbyApi): PremiumBarber {
  const bookingKind = r.booking_kind === "salon" && r.salon_id ? "salon" : "independent";
  return {
    id: String(r.barber_id),
    name: r.name?.trim() || "Barber",
    avatar: mediaSrc(r.avatar, PLACEHOLDER_AVATAR),
    salonName:
      bookingKind === "salon"
        ? r.salon_name?.trim() || "Salon barberi"
        : r.active_services?.length
          ? r.active_services.map((s) => s.name).join(", ")
          : "Mustaqil barber",
    rating: Number(r.avg_rating || 0),
    reviewCount: Number(r.review_count || 0),
    lat: parseFloat(r.latitude ?? "0") || 0,
    lng: parseFloat(r.longitude ?? "0") || 0,
    distanceKm: r.distance_km,
    bookingKind,
    salonId: r.salon_id ? String(r.salon_id) : undefined,
  };
}

async function fetchNearbyBarbers(lat: number, lng: number, radius: number): Promise<PremiumBarber[]> {
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

export default function MapPage() {
  const router = useRouter();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [radiusKm, setRadiusKm] = useState(5);
  const [tab, setTab] = useState<"salons" | "barbers">("salons");
  const [activeId, setActiveId] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setCoords(DEFAULT_CENTER);
      setStatus("fallback");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("granted");
      },
      () => {
        setCoords(DEFAULT_CENTER);
        setStatus("fallback");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 },
    );
  }, []);

  useEffect(() => {
    if (!coords) request();
  }, [coords, request]);

  const salonsQ = useQuery({
    queryKey: ["nearby-salons", coords, radiusKm],
    queryFn: () => (coords ? fetchNearbySalons(coords.lat, coords.lng, radiusKm) : Promise.resolve([])),
    enabled: !!coords,
    retry: false,
  });
  const barbersQ = useQuery({
    queryKey: ["nearby-barbers", coords, radiusKm],
    queryFn: () => (coords ? fetchNearbyBarbers(coords.lat, coords.lng, radiusKm) : Promise.resolve([])),
    enabled: !!coords,
    retry: false,
  });

  const visibleSalons = useMemo(() => (salonsQ.data ?? []).filter(hasMapCoords), [salonsQ.data]);
  const visibleBarbers = useMemo(() => (barbersQ.data ?? []).filter(hasMapCoords), [barbersQ.data]);

  const markers = useMemo(() => {
    if (tab === "salons") return visibleSalons.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, label: s.name }));
    return visibleBarbers.map((b) => ({ id: b.id, lat: b.lat, lng: b.lng, label: b.name }));
  }, [tab, visibleSalons, visibleBarbers]);

  // When marker clicked -> scroll carousel to it
  useEffect(() => {
    if (!activeId || !carouselRef.current) return;
    const el = carouselRef.current.querySelector<HTMLElement>(
      `[data-card-id="${activeId}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeId]);

  const totalCount = tab === "salons" ? visibleSalons.length : visibleBarbers.length;
  const isLoading = tab === "salons" ? salonsQ.isLoading : barbersQ.isLoading;

  return (
    <NeoPage className="fixed inset-0 z-0 overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        {typeof window !== "undefined" ? (
          <LuxuryMapView
            center={coords}
            markers={markers}
            activeId={activeId}
            onMarkerClick={setActiveId}
            radiusKm={radiusKm}
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <MapPin className="h-6 w-6 animate-pulse" />
          </div>
        )}
      </div>

      {/* Top floating overlay: back + status + tabs */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-safe">
        <div className="pointer-events-auto mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Orqaga"
            className="grid h-11 w-11 cursor-pointer place-items-center rounded-lg border-2 border-border bg-surface shadow-card outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex flex-1 items-center gap-2 rounded-lg border-2 border-border bg-surface px-3 py-2 shadow-card">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-foreground" />
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-foreground">
              {status === "loading" && "Joylashuv aniqlanmoqda…"}
              {status === "granted" && "Joylashuv aniqlandi"}
              {status === "fallback" && "Toshkent markazi"}
              {status === "denied" && "Ruxsat kerak"}
              {status === "idle" && "Atrofni qidirish"}
            </span>
            <span className="rounded-md border-2 border-border bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
              {totalCount}
            </span>
          </div>
        </div>

        {/* Tab pills */}
        <div className="pointer-events-auto mt-2 flex justify-center">
          <div className="inline-flex rounded-xl border-2 border-border bg-surface p-1 shadow-card">
            {(["salons", "barbers"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setActiveId(null);
                }}
                className={[
                  "relative rounded-lg px-4 py-1.5 text-[12px] font-extrabold transition",
                  tab === t ? "text-primary-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                {tab === t && (
                  <motion.span
                    layoutId="map-tab-pill"
                    className="absolute inset-0 -z-0 rounded-lg border-2 border-border bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {t === "salons" ? "Salonlar" : "Barberlar"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating right rail: locate + radius */}
      <div className="pointer-events-none absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-end gap-2">
        <div className="pointer-events-auto flex flex-col items-center gap-1.5 rounded-xl border-2 border-border bg-surface p-1.5 shadow-card">
          {RADII.map((r) => {
            const active = radiusKm === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRadiusKm(r)}
                aria-pressed={active}
                className={[
                  "min-h-[36px] min-w-[40px] rounded-md border-2 border-border px-2 text-[10px] font-bold transition",
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {r}km
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={request}
          aria-label="Mening joylashuvim"
          className="pointer-events-auto grid h-11 w-11 cursor-pointer place-items-center rounded-lg border-2 border-border bg-surface shadow-card outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Crosshair className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom luxury carousel */}
      <div
        className="pointer-events-none absolute inset-x-0 z-20"
        style={{ bottom: "calc(5.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div
          ref={carouselRef}
          className="pointer-events-auto flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-3 py-1 scrollbar-none"
        >
          {isLoading
            ? [0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[126px] w-[280px] shrink-0 animate-pulse snap-center rounded-xl border-2 border-border bg-surface shadow-card"
                />
              ))
            : tab === "salons"
              ? visibleSalons.map((s) => (
                  <SalonCarouselCard
                    key={s.id}
                    salon={s}
                    active={activeId === s.id}
                    onTap={() => setActiveId(s.id)}
                  />
                ))
              : visibleBarbers.map((b) => (
                  <BarberCarouselCard
                    key={b.id}
                    barber={b}
                    active={activeId === b.id}
                    onTap={() => setActiveId(b.id)}
                  />
                ))}
          {!isLoading && totalCount === 0 && (
            <div className="grid h-[126px] w-full place-items-center rounded-xl border-2 border-border bg-surface px-4 text-center shadow-card">
              <div>
                <p className="text-sm font-semibold text-foreground">Hech narsa topilmadi</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Radiusni kengaytirib koʻring
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </NeoPage>
  );
}

function SalonCarouselCard({
  salon,
  active,
  onTap,
}: {
  salon: Salon;
  active: boolean;
  onTap: () => void;
}) {
  return (
    <Link
      to="/salon/$id"
      params={{ id: salon.id }}
      data-card-id={salon.id}
      onMouseEnter={onTap}
      onTouchStart={onTap}
      className={[
        "group relative flex w-[280px] shrink-0 snap-center cursor-pointer items-center gap-3 overflow-hidden rounded-3xl border bg-surface/95 p-3 shadow-card backdrop-blur transition active:scale-[0.99]",
        active ? "border-foreground ring-2 ring-foreground/40 shadow-luxury" : "border-border hover:border-foreground/30",
      ].join(" ")}
    >
      <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl">
        <img
          src={salon.coverImage || PLACEHOLDER_SALON}
          alt={salon.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {salon.isPremium && (
          <span className="absolute left-1 top-1 rounded-full bg-gold/95 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-gold-foreground">
            Premium
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 text-[13px] font-bold text-foreground">{salon.name}</h3>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
          {salon.address}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <RatingStars value={salon.rating} count={salon.reviewCount} />
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          {salon.distance > 0 && (
            <span className="text-[10px] font-semibold text-foreground">
              {formatKm(salon.distance)}
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-0.5 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
            Band <ChevronRight className="h-2.5 w-2.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function BarberCarouselCard({
  barber,
  active,
  onTap,
}: {
  barber: PremiumBarber;
  active: boolean;
  onTap: () => void;
}) {
  const isSalon = barber.bookingKind === "salon" && !!barber.salonId;
  const Wrapper = (props: { children: React.ReactNode }) =>
    isSalon ? (
      <Link
        to="/booking/$salonId"
        params={{ salonId: barber.salonId! }}
        data-card-id={barber.id}
        onMouseEnter={onTap}
        onTouchStart={onTap}
        className={[
          "group relative flex w-[280px] shrink-0 snap-center cursor-pointer items-center gap-3 overflow-hidden rounded-3xl border bg-surface/95 p-3 shadow-card backdrop-blur transition active:scale-[0.99]",
          active ? "border-foreground ring-2 ring-foreground/40 shadow-luxury" : "border-border hover:border-foreground/30",
        ].join(" ")}
      >
        {props.children}
      </Link>
    ) : (
      <Link
        to="/booking/barber/$barberId"
        params={{ barberId: barber.id }}
        data-card-id={barber.id}
        onMouseEnter={onTap}
        onTouchStart={onTap}
        className={[
          "group relative flex w-[280px] shrink-0 snap-center cursor-pointer items-center gap-3 overflow-hidden rounded-3xl border bg-surface/95 p-3 shadow-card backdrop-blur transition active:scale-[0.99]",
          active ? "border-foreground ring-2 ring-foreground/40 shadow-luxury" : "border-border hover:border-foreground/30",
        ].join(" ")}
      >
        {props.children}
      </Link>
    );

  return (
    <Wrapper>
      <div className="relative h-[88px] w-[88px] shrink-0">
        <img
          src={barber.avatar}
          alt={barber.name}
          loading="lazy"
          className="h-full w-full rounded-full object-cover ring-2 ring-gold/30"
        />
        <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-[8px] font-bold text-background ring-2 ring-surface">
          <Star className="h-3 w-3 fill-gold text-gold" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 text-[13px] font-bold text-foreground">{barber.name}</h3>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
          {barber.salonName}
        </p>
        <div className="mt-1.5">
          <RatingStars value={barber.rating} count={barber.reviewCount} />
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          {barber.distanceKm != null && (
            <span className="text-[10px] font-semibold text-foreground">
              {formatKm(barber.distanceKm)}
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-0.5 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
            Band <ChevronRight className="h-2.5 w-2.5" />
          </span>
        </div>
      </div>
    </Wrapper>
  );
}
