"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crosshair, Locate, MapPin } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { mediaSrc, PLACEHOLDER_AVATAR } from "@/lib/media";
import { mapSalonListApi, type SalonListApi } from "@/lib/mapSalon";
import type { Salon } from "@/types";
import { RadiusSelector } from "@/components/luxury/RadiusSelector";
import { SalonCardPremium } from "@/components/luxury/SalonCardPremium";
import { BarberCardPremium, type PremiumBarber } from "@/components/luxury/BarberCardPremium";
import { EmptyStateLuxury, LoadingSkeleton } from "@/components/luxury/States";
import { MapView as LuxuryMapView } from "@/components/luxury/MapView";

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
  avg_rating?: number | null;
  review_count?: number | null;
  active_services?: Array<{ name: string }>;
};

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
  return {
    id: String(r.barber_id),
    name: r.name?.trim() || "Barber",
    avatar: mediaSrc(r.avatar, PLACEHOLDER_AVATAR),
    salonName: r.active_services?.length
      ? r.active_services.map((s) => s.name).join(", ")
      : "Mustaqil barber",
    rating: Number(r.avg_rating || 0),
    reviewCount: Number(r.review_count || 0),
    lat: parseFloat(r.latitude ?? "0") || 0,
    lng: parseFloat(r.longitude ?? "0") || 0,
    distanceKm: r.distance_km,
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
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [radiusKm, setRadiusKm] = useState(5);
  const [tab, setTab] = useState<"salons" | "barbers">("salons");
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const markers = useMemo(() => {
    if (tab === "salons") return (salonsQ.data ?? []).map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, label: s.name }));
    return (barbersQ.data ?? []).map((b) => ({ id: b.id, lat: b.lat, lng: b.lng, label: b.name }));
  }, [tab, salonsQ.data, barbersQ.data]);

  return (
    <div className="flex h-[calc(100dvh-5.5rem)] flex-col">
      <header className="px-4 pb-3 pt-safe">
        <div className="flex items-center justify-between pt-4">
          <div>
            <p className="label-eyebrow">Yaqin atrofingiz</p>
            <h1 className="text-xl font-bold tracking-tight">
              {status === "loading" && "Joylashuv aniqlanmoqda..."}
              {status === "granted" && "Joylashuv aniqlandi"}
              {status === "fallback" && "Toshkent markazi"}
              {status === "denied" && "Ruxsat berilmadi"}
              {status === "idle" && "Joylashuv kerak"}
            </h1>
          </div>
          <button
            type="button"
            onClick={request}
            className="rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold shadow-soft"
          >
            <Locate className="inline h-3.5 w-3.5" /> Qayta
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <RadiusSelector radiusKm={radiusKm} onChange={setRadiusKm} />
          <span className="text-xs text-muted-foreground">{markers.length} ta natija</span>
        </div>
      </header>

      <div className="relative mx-4 flex-1 overflow-hidden rounded-3xl border border-border bg-muted shadow-card">
        {typeof window !== "undefined" ? (
          <LuxuryMapView center={coords} markers={markers} activeId={activeId} onMarkerClick={setActiveId} radiusKm={radiusKm} />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground"><MapPin className="h-6 w-6 animate-pulse" /></div>
        )}
        <button
          type="button"
          onClick={request}
          aria-label="Mening joylashuvim"
          className="absolute bottom-4 right-4 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-luxury"
        >
          <Crosshair className="h-5 w-5" />
        </button>
      </div>

      <section className="px-4 pt-3">
        <div className="inline-flex rounded-full border border-border bg-surface p-1 shadow-soft">
          {(["salons", "barbers"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={[
                "rounded-full px-4 py-1.5 text-xs font-semibold transition",
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              ].join(" ")}
            >
              {t === "salons" ? "Salonlar" : "Barberlar"}
            </button>
          ))}
        </div>
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pb-2 scrollbar-none">
          {tab === "salons" ? (
            salonsQ.isLoading ? (
              <LoadingSkeleton className="h-20" />
            ) : (salonsQ.data ?? []).length === 0 ? (
              <EmptyStateLuxury title="Bo'sh" body="Radiusni kattalashtiring." />
            ) : (
              (salonsQ.data ?? []).map((s) => (
                <div key={s.id} onMouseEnter={() => setActiveId(s.id)} className={activeId === s.id ? "ring-2 ring-gold rounded-2xl" : undefined}>
                  <SalonCardPremium salon={s} layout="horizontal" />
                </div>
              ))
            )
          ) : barbersQ.isLoading ? (
            <LoadingSkeleton className="h-20" />
          ) : (barbersQ.data ?? []).length === 0 ? (
            <EmptyStateLuxury title="Bo'sh" body="Radiusni kattalashtiring." />
          ) : (
            (barbersQ.data ?? []).map((b) => (
              <div key={b.id} onMouseEnter={() => setActiveId(b.id)} className={activeId === b.id ? "ring-2 ring-gold rounded-2xl" : undefined}>
                <BarberCardPremium barber={b} layout="horizontal" />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
