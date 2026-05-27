"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  Baby,
  Bell,
  ChevronRight,
  Crown,
  MapPin,
  Scissors,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { Link, useRouter } from "@/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiFetch, getAccessToken } from "@/lib/api";
import { fetchSalons } from "@/lib/salon-queries";
import { mapSalonListApi, type SalonListApi } from "@/lib/mapSalon";
import type { Salon } from "@/types";
import { formatKm, initials } from "@/lib/format";
import type { DiscoveryMarkerItem } from "@/components/luxury/DiscoveryMap";
import { fetchNotifications } from "@/lib/notifications-queries";

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

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 5) return "Xayrli tun";
  if (h < 12) return "Xayrli tong";
  if (h < 17) return "Xayrli kun";
  if (h < 21) return "Xayrli oqshom";
  return "Xayrli kech";
}

export default function Index() {
  const router = useRouter();
  const isLoggedIn = !!getAccessToken();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm] = useState(2);
  const [cat, setCat] = useState<string | null>(null);

  const requestGeo = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setCoords(DEFAULT_CENTER);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
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

  const unreadTop = !notifErr ? notifications.filter((n) => !n.read_at).length : 0;

  const listBase = useMemo(() => {
    const nearbyOk = nearbyQ.data && nearbyQ.data.length > 0;
    return nearbyOk ? nearbyQ.data! : allQ.data ?? [];
  }, [nearbyQ.data, allQ.data]);

  const list = useMemo(
    () => listBase.filter((s) => matchesCategory(s, cat)),
    [listBase, cat],
  );

  const previewMarkers: DiscoveryMarkerItem[] = useMemo(
    () =>
      list
        .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng) && Math.abs(s.lat) > 0.01)
        .slice(0, 12)
        .map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, label: s.name })),
    [list],
  );

  const loadingList =
    coords != null &&
    (nearbyQ.isPending || nearbyQ.isFetching) &&
    !(nearbyQ.data?.length || allQ.data?.length);

  const greeting = greetingFor(new Date());
  const displayName = me?.full_name?.trim() || me?.email?.split("@")[0] || "";
  const canRenderMap = typeof window !== "undefined";

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background">
      {/* Hero gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            "radial-gradient(80% 60% at 100% 0%, oklch(0.82 0.13 80 / 0.18) 0%, transparent 60%), radial-gradient(110% 100% at 0% 0%, oklch(0.96 0.012 80) 0%, oklch(0.985 0.005 80) 70%)",
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <header className="px-5 pt-safe">
          <div className="flex items-center gap-3 pt-3">
            <Link
              to={me ? "/profile" : "/auth"}
              aria-label="Profil"
              className="grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-foreground text-[12px] font-bold text-background shadow-soft ring-1 ring-foreground/20"
            >
              {me?.full_name ? initials(me.full_name) : me?.email ? initials(me.email) : "MB"}
            </Link>
            <div className="min-w-0 flex-1">
              <p className="label-eyebrow truncate">{greeting}</p>
              <p className="truncate text-[15px] font-semibold text-foreground">
                {displayName ? displayName : "MyBarberga xush kelibsiz"}
              </p>
            </div>
            <Link
              to="/notifications"
              aria-label="Xabarlar"
              className="relative grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-border bg-surface shadow-soft outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Bell className="h-[18px] w-[18px] text-foreground" />
              {unreadTop > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[9px] font-bold leading-none text-gold-foreground ring-2 ring-background">
                  {unreadTop > 9 ? "9+" : unreadTop}
                </span>
              )}
            </Link>
          </div>

          {/* Display title */}
          <div className="mt-6">
            <h1 className="font-display text-[30px] font-semibold leading-[1.05] tracking-tight text-foreground text-balance">
              Eng yaxshi sartaroshlar.<br />
              <span className="text-shimmer-gold">Bir tegishda.</span>
            </h1>
            <p className="mt-2 max-w-[28ch] text-sm text-muted-foreground text-pretty">
              Salon yoki mustaqil barberni toping va xizmatni soniyalar ichida band qiling.
            </p>
          </div>

          {/* Search */}
          <button
            type="button"
            onClick={() => router.push("/map")}
            className="mt-5 flex w-full cursor-pointer items-center gap-3 rounded-full border border-border bg-surface px-4 py-3.5 text-left shadow-soft outline-none transition active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 truncate text-sm text-muted-foreground">
              Salon yoki barber qidirish
            </span>
            <span className="rounded-full bg-foreground px-3 py-1.5 text-[11px] font-semibold text-background">
              Qidirish
            </span>
          </button>
        </header>

        {/* Categories */}
        <section className="mt-7 px-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Kategoriyalar</h2>
            {cat && (
              <button
                type="button"
                onClick={() => setCat(null)}
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
              >
                Tozalash
              </button>
            )}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            {CATEGORIES.map(({ id, label, Icon }) => {
              const active = cat === id;
              return (
                <motion.button
                  key={id}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setCat(active ? null : id)}
                  className={[
                    "group relative flex min-h-[80px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border px-2 py-3 text-[11px] font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-foreground bg-foreground text-background shadow-luxury"
                      : "border-border bg-surface text-foreground shadow-soft hover:border-foreground/40",
                  ].join(" ")}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-30"
                      style={{
                        background:
                          "radial-gradient(60% 60% at 50% 0%, oklch(0.82 0.14 82 / 0.6), transparent 70%)",
                      }}
                    />
                  )}
                  <span
                    className={[
                      "grid h-8 w-8 place-items-center rounded-xl transition",
                      active ? "bg-background/15 text-background" : "bg-muted text-foreground",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  <span className="text-center leading-tight">{label}</span>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Map preview widget */}
        <section className="mt-6 px-5">
          <button
            type="button"
            onClick={() => router.push("/map")}
            aria-label="Xarita orqali qidirish"
            className="group relative block w-full cursor-pointer overflow-hidden rounded-3xl border border-border bg-surface text-left shadow-card outline-none transition hover:shadow-luxury focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="relative h-[180px] w-full">
              {canRenderMap && coords && (
                <Suspense
                  fallback={
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <MapPin className="h-5 w-5 animate-pulse text-muted-foreground" />
                    </div>
                  }
                >
                  <div className="pointer-events-none h-full w-full">
                    <DiscoveryMap
                      center={coords}
                      markers={previewMarkers}
                      activeId={null}
                      onMarkerClick={() => {}}
                      radiusKm={radiusKm}
                    />
                  </div>
                </Suspense>
              )}
              {/* Glass overlay + caption */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 40%, color-mix(in oklab, var(--surface) 92%, transparent) 100%)",
                }}
              />
              <div className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-foreground/85 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-background backdrop-blur">
                <MapPin className="h-3 w-3" /> Xarita
              </div>
              <div className="pointer-events-none absolute right-4 top-4 rounded-full bg-surface/95 px-3 py-1.5 text-[10px] font-semibold text-foreground shadow-soft backdrop-blur">
                {previewMarkers.length} ta atrofda
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">Xarita orqali qidirish</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  Joylashuvingiz atrofidagi salon va barberlarni xaritada koʻring
                </p>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background transition group-hover:scale-105">
                <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </button>
        </section>

        {/* Top salons grid */}
        <section className="mt-7 px-5 pb-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="label-eyebrow">Tavsiya etiladi</p>
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                Yuqori reytingli salonlar
              </h2>
            </div>
            <Link
              to="/map"
              className="inline-flex items-center gap-0.5 text-xs font-semibold text-foreground"
            >
              Barchasi <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4">
            {loadingList || allQ.isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-[220px] animate-pulse rounded-3xl bg-muted" />
                ))}
              </div>
            ) : list.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-surface p-8 text-center shadow-soft">
                <p className="text-sm font-semibold text-foreground">Hech narsa topilmadi</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Boshqa kategoriya tanlang yoki radiusni kengaytirish uchun xaritaga oʻting.
                </p>
                <Link
                  to="/map"
                  className="mt-3 inline-flex items-center gap-1 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
                >
                  Xaritaga <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {list.slice(0, 8).map((s) => (
                  <SalonGridCard key={s.id} salon={s} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SalonGridCard({ salon }: { salon: Salon }) {
  return (
    <Link
      to="/salon/$id"
      params={{ id: salon.id }}
      className="group block cursor-pointer overflow-hidden rounded-3xl border border-border bg-surface shadow-soft transition hover:-translate-y-0.5 hover:shadow-luxury active:scale-[0.99]"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <img
          src={salon.coverImage}
          alt={salon.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/3"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, oklch(0 0 0 / 0.6) 80%, oklch(0 0 0 / 0.85) 100%)",
          }}
        />
        {salon.isPremium && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-gold/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-foreground shadow-soft">
            <Crown className="h-2.5 w-2.5" /> Premium
          </span>
        )}
        {salon.distance > 0 && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-background/95 px-2 py-0.5 text-[9px] font-semibold text-foreground shadow-soft backdrop-blur">
            {formatKm(salon.distance)}
          </span>
        )}
        <div className="absolute inset-x-2.5 bottom-2.5 text-white">
          <h3 className="line-clamp-1 text-[13px] font-bold leading-tight drop-shadow">
            {salon.name}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-[10px] text-white/80">{salon.address}</p>
          <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-0.5 text-[10px] font-bold text-foreground">
            <Star className="h-2.5 w-2.5 fill-gold text-gold" />
            {salon.rating.toFixed(1)}
            <span className="font-normal text-muted-foreground">({salon.reviewCount})</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
