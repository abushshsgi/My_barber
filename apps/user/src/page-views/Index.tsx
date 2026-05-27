"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Baby,
  Bell,
  ChevronRight,
  Crown,
  Locate,
  MapPin,
  Scissors,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { Link, useRouter } from "@/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, getAccessToken } from "@/lib/api";
import { fetchSalons } from "@/lib/salon-queries";
import { mapSalonListApi, type SalonListApi } from "@/lib/mapSalon";
import type { Salon } from "@/types";
import { formatKm, initials } from "@/lib/format";
import type { DiscoveryMarkerItem } from "@/components/luxury/DiscoveryMap";
import { fetchNotifications } from "@/lib/notifications-queries";
import { unreadNotificationCount } from "../lib/notification-prefs";
import { useUserPreferences } from "@/hooks/useUserPreferences";

const DiscoveryMap = lazy(async () => {
  const m = await import("@/components/luxury/DiscoveryMap");
  return { default: m.DiscoveryMap };
});

const DEFAULT_CENTER = { lat: 41.3111, lng: 69.2797 };

const CATEGORIES = [
  { id: "haircut", label: "Soch olish", Icon: Scissors },
  { id: "beard", label: "Soqol", Icon: Sparkles },
  { id: "premium", label: "Premium", Icon: Crown },
  { id: "kids", label: "Bolalar", Icon: Baby },
] as const;

// Three sheet sizes (Yandex Go style)
const SHEET = { peek: 0.32, mid: 0.6, full: 0.92 } as const;
type SheetState = keyof typeof SHEET;

type NearbyRow = { salon: SalonListApi; distance_km: number };

type MeLite = { full_name?: string | null; email?: string };

async function fetchMeOptional(): Promise<MeLite | null> {
  const res = await apiFetch("/api/v1/users/me/");
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) return null;
  return res.json() as Promise<MeLite>;
}

async function fetchNearbySalons(lat: number, lng: number, radius: number): Promise<Salon[]> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius_km: String(radius),
  });
  const res = await apiFetch(`/api/v1/salons/nearby/?${params}`);
  if (!res.ok) throw new Error("Yaqin salonlar yuklanmadi");
  const rows = (await res.json()) as NearbyRow[];
  return rows.map((r) => {
    const s = mapSalonListApi(r.salon);
    return { ...s, distance: r.distance_km };
  });
}

function matchesCategory(s: Salon, cat: string | null): boolean {
  if (!cat) return true;
  const blob = `${s.name} ${s.description}`.toLowerCase();
  if (cat === "premium") return s.isPremium === true;
  if (cat === "haircut") return /soch|hair|turmak/i.test(blob);
  if (cat === "beard") return /soqol|beard/i.test(blob);
  if (cat === "kids") return /bola|kids|bogcha/i.test(blob);
  return true;
}

export default function Index() {
  const router = useRouter();
  const isLoggedIn = !!getAccessToken();
  const prefs = useUserPreferences();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm] = useState(2);
  const [cat, setCat] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>("mid");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ y: number; h: number } | null>(null);
  const [dragH, setDragH] = useState<number | null>(null);

  const requestGeo = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setCoords(DEFAULT_CENTER);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        setCoords(DEFAULT_CENTER);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 },
    );
  }, []);

  useEffect(() => {
    requestGeo();
  }, [requestGeo]);

  const nearbyQ = useQuery({
    queryKey: ["home-nearby", coords?.lat, coords?.lng, radiusKm],
    queryFn: () => fetchNearbySalons(coords!.lat, coords!.lng, radiusKm),
    enabled: !!coords,
    retry: false,
  });

  const allQ = useQuery({
    queryKey: ["salons"],
    queryFn: fetchSalons,
    retry: false,
  });

  const { data: me } = useQuery({
    queryKey: ["me-banner"],
    queryFn: fetchMeOptional,
    enabled: isLoggedIn,
    retry: false,
    staleTime: 60_000,
  });

  const { data: notifications = [], isError: notifErr } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    staleTime: 30_000,
    retry: false,
    enabled: isLoggedIn,
  });

  const unreadTop = !notifErr ? unreadNotificationCount(notifications, prefs) : 0;

  const listBase = useMemo(() => {
    const nearbyOk = nearbyQ.data && nearbyQ.data.length > 0;
    return nearbyOk ? nearbyQ.data! : allQ.data ?? [];
  }, [nearbyQ.data, allQ.data]);

  const list = useMemo(
    () => listBase.filter((s) => matchesCategory(s, cat)),
    [listBase, cat],
  );

  const markers: DiscoveryMarkerItem[] = useMemo(
    () =>
      list
        .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng) && Math.abs(s.lat) > 0.01)
        .map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, label: s.name })),
    [list],
  );

  const loadingList =
    coords != null &&
    (nearbyQ.isPending || nearbyQ.isFetching) &&
    !(nearbyQ.data?.length || allQ.data?.length);

  const onDragStart = (e: React.PointerEvent) => {
    const el = sheetRef.current;
    if (!el) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { y: e.clientY, h: el.getBoundingClientRect().height };
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dy = e.clientY - dragRef.current.y;
    const next = Math.min(
      window.innerHeight * 0.95,
      Math.max(window.innerHeight * 0.18, dragRef.current.h - dy),
    );
    setDragH(next);
  };
  const onDragEnd = () => {
    if (!dragRef.current) return;
    const h = dragH ?? dragRef.current.h;
    const ratio = h / window.innerHeight;
    const target: SheetState = ratio < 0.45 ? "peek" : ratio < 0.75 ? "mid" : "full";
    setSheet(target);
    setDragH(null);
    dragRef.current = null;
  };

  const sheetHeight = dragH != null ? `${dragH}px` : `${SHEET[sheet] * 100}vh`;
  const canRenderMap = typeof window !== "undefined";

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <div className="absolute inset-0">
        {canRenderMap && (
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                Xarita…
              </div>
            }
          >
            <DiscoveryMap
              center={coords}
              markers={markers}
              activeId={activeId}
              onMarkerClick={(id) => {
                setActiveId(id);
                setSheet("mid");
              }}
              radiusKm={radiusKm}
            />
          </Suspense>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 pt-safe">
        <div className="pointer-events-auto mx-3 mt-3 flex items-center gap-2">
          <Link
            to={me ? "/profile" : "/auth"}
            aria-label="Profil"
            className="grid h-12 w-12 place-items-center rounded-full bg-surface shadow-card ring-1 ring-border"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-[11px] font-bold text-background">
              {me?.full_name ? initials(me.full_name) : me?.email ? initials(me.email) : "MB"}
            </span>
          </Link>

          <button
            type="button"
            onClick={() => router.push("/map")}
            className="flex flex-1 items-center gap-3 rounded-full bg-surface py-3 pl-4 pr-3 shadow-card ring-1 ring-border"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 truncate text-left text-sm text-muted-foreground">
              Salon yoki barber qidirish
            </span>
          </button>

          <Link
            to="/notifications"
            aria-label="Xabarlar"
            className="relative grid h-12 w-12 place-items-center rounded-full bg-surface shadow-card ring-1 ring-border"
          >
            <Bell className="h-5 w-5 text-foreground" />
            {unreadTop > 0 && (
              <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 text-[9px] font-bold text-background ring-2 ring-surface">
                {unreadTop}
              </span>
            )}
          </Link>
        </div>

        <div className="pointer-events-auto absolute right-3 top-[6.5rem] flex flex-col gap-2">
          <button
            type="button"
            onClick={requestGeo}
            aria-label="Mening joylashuvim"
            className="grid h-11 w-11 place-items-center rounded-full bg-surface shadow-card ring-1 ring-border active:scale-95"
          >
            <Locate className="h-4 w-4 text-foreground" />
          </button>
        </div>
      </div>

      <div
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-[28px] bg-surface shadow-luxury ring-1 ring-border transition-[height] duration-300 ease-out"
        style={{
          height: sheetHeight,
          transitionDuration: dragH != null ? "0ms" : undefined,
          paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div
          className="flex cursor-grab touch-none flex-col items-center pt-2.5 pb-1 active:cursor-grabbing"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          onClick={() => setSheet(sheet === "peek" ? "mid" : sheet === "mid" ? "full" : "peek")}
        >
          <span className="h-1.5 w-12 rounded-full bg-border" />
        </div>

        <div className="px-4 pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Xizmatlar
          </p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {CATEGORIES.map(({ id, label, Icon }) => {
              const active = cat === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCat(active ? null : id)}
                  className={[
                    "group flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-[11px] font-semibold transition active:scale-[0.97]",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-center leading-tight">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between px-4">
          <h2 className="text-[15px] font-bold tracking-tight text-foreground">
            Yaqin atrofdagi salonlar
          </h2>
          <Link to="/map" className="inline-flex items-center gap-0.5 text-xs font-semibold text-foreground">
            Xaritada <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-2 flex-1 overflow-y-auto px-4 pb-4 scrollbar-none">
          {loadingList || allQ.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center">
              <p className="text-sm font-semibold text-foreground">Hech narsa topilmadi</p>
              <p className="mt-1 text-xs text-muted-foreground">Boshqa kategoriya tanlang.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {list.map((s) => (
                <li key={s.id}>
                  <SalonRow
                    salon={s}
                    active={activeId === s.id}
                    onHover={() => setActiveId(s.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SalonRow({
  salon,
  active,
  onHover,
}: {
  salon: Salon;
  active: boolean;
  onHover: () => void;
}) {
  return (
    <Link
      to="/salon/$id"
      params={{ id: salon.id }}
      onMouseEnter={onHover}
      onFocus={onHover}
      className={[
        "flex items-center gap-3 rounded-2xl bg-background p-3 ring-1 transition active:scale-[0.99]",
        active ? "ring-foreground" : "ring-border hover:ring-foreground/40",
      ].join(" ")}
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
        <img
          src={salon.coverImage}
          alt={salon.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate text-sm font-bold text-foreground">{salon.name}</h3>
          <span
            className={[
              "ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
              salon.isPremium ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
            ].join(" ")}
          >
            {salon.isPremium ? "Premium" : "Standart"}
          </span>
        </div>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {salon.address}
          {salon.distance > 0 ? <span>· {formatKm(salon.distance)}</span> : null}
        </p>
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-foreground">
          <Star className="h-3 w-3 fill-foreground" />
          {salon.rating.toFixed(1)}
          <span className="font-normal text-muted-foreground">({salon.reviewCount})</span>
        </p>
      </div>
    </Link>
  );
}
