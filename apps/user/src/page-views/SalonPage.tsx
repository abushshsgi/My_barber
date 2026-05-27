"use client";

import { useEffect, useState } from "react";
import { Link, useParams, useRouter } from "@/navigation";
import {
  ArrowLeft,
  Clock,
  Crown,
  Globe,
  Heart,
  MapPin,
  Phone,
  Share2,
  Sparkles,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiFetch, getAccessToken } from "@/lib/api";
import { mediaSrc, PLACEHOLDER_SALON } from "@/lib/media";
import { RatingStars } from "@/components/luxury/RatingStars";
import { EmptyStateLuxury, LoadingSkeleton } from "@/components/luxury/States";
import { formatSom } from "@/lib/format";
import { fetchFavoriteSalonIds, isFavoriteSalon, setFavoriteSalon } from "../lib/favorites";
import { cn } from "@/lib/utils";

type SalonDetail = {
  id: number;
  name: string;
  description: string;
  cover_image: string | null;
  address: string;
  phone?: string;
  premium: boolean;
  languages: string[];
  rating_avg?: number;
  review_count?: number;
  services: {
    id: number;
    name: string;
    price: string;
    duration_minutes: number;
  }[];
  images: { id: number; image: string }[];
  hours: { weekday: number; open_time: string; close_time: string }[];
};

const WEEKDAY_UZ = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];

type ReviewApi = {
  id: number;
  rating: number;
  text: string;
  author_name: string;
  created_at: string;
  barber_reply?: string;
  barber_replied_at?: string | null;
};

type StaffApi = {
  id: number;
  full_name: string;
  avatar: string | null;
  role: string;
  experience_years: number | null;
};

type PortfolioItem = {
  image: string | null;
  booking_id: number;
};

const TABS = [
  { id: "about" as const, label: "Maʼlumot" },
  { id: "services" as const, label: "Xizmatlar" },
  { id: "staff" as const, label: "Staff" },
  { id: "reviews" as const, label: "Sharhlar" },
] as const;

export default function SalonPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const id = params?.id as string;
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("about");
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    setLoggedIn(!!getAccessToken());
    if (id) setFavorite(isFavoriteSalon(id));
  }, [id]);

  useQuery({
    queryKey: ["favorites", "salons"],
    queryFn: async () => {
      const ids = await fetchFavoriteSalonIds();
      setFavorite(ids.includes(String(id)));
      return ids;
    },
    enabled: !!id && loggedIn,
  });

  const favoriteMutation = useMutation({
    mutationFn: async () => setFavoriteSalon(id, !favorite),
    onSuccess: (next) => {
      setFavorite(next);
      qc.invalidateQueries({ queryKey: ["favorites", "salons"] });
      qc.invalidateQueries({ queryKey: ["favorites", "salons", "count"] });
    },
  });

  const { data: salon, isLoading, isError, error } = useQuery({
    queryKey: ["salon", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/salons/${id}/`);
      if (!res.ok) throw new Error("Salon topilmadi");
      return res.json() as Promise<SalonDetail>;
    },
    enabled: !!id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reviews/?salon=${id}`);
      if (!res.ok) return [];
      const j = (await res.json()) as { results?: ReviewApi[] } | ReviewApi[];
      return Array.isArray(j) ? j : j.results || [];
    },
    enabled: !!id,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["salon-staff", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/salons/${id}/staff/`);
      if (!res.ok) return [];
      const j = (await res.json()) as StaffApi[];
      return Array.isArray(j) ? j : [];
    },
    enabled: !!id,
  });

  const { data: portfolio = [] } = useQuery({
    queryKey: ["salon-portfolio", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/salons/${id}/portfolio/`);
      if (!res.ok) return [];
      const j = (await res.json()) as PortfolioItem[];
      return Array.isArray(j) ? j.filter((row) => !!row.image) : [];
    },
    enabled: !!id,
  });

  if (isLoading || !salon) {
    return (
      <div className="space-y-3 p-4">
        <LoadingSkeleton className="h-72 w-full rounded-3xl" />
        <LoadingSkeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError || !salon) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
        <EmptyStateLuxury title="Salon yoʻq" body={error instanceof Error ? error.message : "Maʼlumot yuklanmadi."} />
        <Link to="/" className="text-sm font-semibold text-foreground underline">
          Asosiy sahifaga
        </Link>
      </div>
    );
  }

  const sortedHours = [...(salon.hours || [])].sort((a, b) => a.weekday - b.weekday);
  const reviewAvgFromList =
    reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;
  const starsRating =
    typeof salon.rating_avg === "number" && salon.rating_avg > 0
      ? salon.rating_avg
      : reviewAvgFromList;
  const reviewCountShown =
    typeof salon.review_count === "number" ? salon.review_count : reviews.length;

  return (
    <div className="relative w-full bg-background pb-44">
      {/* Hero cover */}
      <div className="relative">
        <img
          src={mediaSrc(salon.cover_image, PLACEHOLDER_SALON)}
          alt={salon.name}
          className="h-[320px] w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/3"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, oklch(0 0 0 / 0.35) 60%, oklch(0 0 0 / 0.85) 100%)",
          }}
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-safe">
          <button
            type="button"
            onClick={() =>
              typeof window !== "undefined" && window.history.length > 1
                ? window.history.back()
                : router.push("/")
            }
            className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-white/30 bg-black/30 text-white shadow-soft backdrop-blur outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Ulashish"
              className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-white/30 bg-black/30 text-white shadow-soft backdrop-blur outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() =>
                navigator.share
                  ?.({ title: salon.name, url: window.location.href })
                  .catch(() => null)
              }
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={favorite ? "Sevimlidan olib tashlash" : "Saqlash"}
              className={cn(
                "grid h-11 w-11 cursor-pointer place-items-center rounded-full border shadow-soft backdrop-blur outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
                favorite
                  ? "border-gold/60 bg-gold text-gold-foreground"
                  : "border-white/30 bg-black/30 text-white",
              )}
              onClick={() => favoriteMutation.mutate()}
            >
              <motion.span
                key={String(favorite)}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 18 }}
              >
                <Heart className={cn("h-4 w-4", favorite && "fill-current")} />
              </motion.span>
            </button>
          </div>
        </div>

        {salon.premium && (
          <span className="absolute left-4 top-[calc(env(safe-area-inset-top,0px)+4rem)] inline-flex items-center gap-1 rounded-full bg-gold/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-foreground shadow-soft">
            <Crown className="h-3 w-3" /> Premium
          </span>
        )}

        {/* Hero text on cover */}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5 text-white">
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight drop-shadow text-balance">
            {salon.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/85">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 font-semibold backdrop-blur">
              <Sparkles className="h-3 w-3 fill-gold text-gold" />
              {(starsRating || 0).toFixed(1)} · {reviewCountShown}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{salon.address}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="-mt-6 rounded-t-3xl bg-background px-5 pt-5">
        <div className="-mx-5 flex gap-1 overflow-x-auto border-b border-border px-5 scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "relative shrink-0 cursor-pointer px-4 py-3 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
                tab === t.id ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {t.label}
              {tab === t.id && (
                <motion.span
                  layoutId="salon-tab-underline"
                  className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-foreground"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === "about" && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-foreground/85">
                {salon.description?.trim() || "Salon haqida matn mavjud emas."}
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {salon.phone && (
                  <a
                    href={`tel:${salon.phone.replace(/\s/g, "")}`}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-soft outline-none transition hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                      <Phone className="h-4 w-4 text-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Telefon</p>
                      <p className="text-sm font-semibold text-foreground">{salon.phone}</p>
                    </div>
                  </a>
                )}
                {(salon.languages || []).length > 0 && (
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-soft">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                      <Globe className="h-4 w-4 text-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Tillar</p>
                      <p className="text-sm font-semibold text-foreground">
                        {salon.languages.join(", ")}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {sortedHours.length > 0 && (
                <div className="rounded-2xl border border-border bg-surface p-3 shadow-soft">
                  <p className="label-eyebrow mb-2 inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Ish vaqti
                  </p>
                  <ul className="space-y-1.5 text-xs text-foreground/85">
                    {sortedHours.map((h) => (
                      <li key={h.weekday} className="flex justify-between">
                        <span className="font-semibold">
                          {WEEKDAY_UZ[h.weekday] ?? `Kun ${h.weekday}`}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {h.open_time} — {h.close_time}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(salon.images ?? []).length > 0 && (
                <div>
                  <p className="label-eyebrow mb-2 px-1">Galereya</p>
                  <div className="grid grid-cols-3 gap-2">
                    {salon.images?.slice(0, 9).map((img) => (
                      <img
                        key={img.id}
                        src={mediaSrc(img.image, PLACEHOLDER_SALON)}
                        alt=""
                        loading="lazy"
                        className="aspect-square w-full rounded-xl object-cover shadow-soft"
                      />
                    ))}
                  </div>
                </div>
              )}

              {portfolio.length > 0 && (
                <div>
                  <p className="label-eyebrow mb-2 px-1">Ish natijalari</p>
                  <div className="grid grid-cols-3 gap-2">
                    {portfolio.slice(0, 9).map((item) => (
                      <img
                        key={item.booking_id}
                        src={mediaSrc(item.image, PLACEHOLDER_SALON)}
                        alt=""
                        loading="lazy"
                        className="aspect-square w-full rounded-xl object-cover shadow-soft"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "services" &&
            ((salon.services?.length ?? 0) === 0 ? (
              <EmptyStateLuxury title="Xizmatlar yoʻq" body="Administrator xizmatlarni qoʻshishi kerak." />
            ) : (
              <ul className="space-y-2">
                {salon.services?.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3.5 shadow-soft"
                  >
                    <div className="min-w-0">
                      <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{s.name}</h3>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" /> {s.duration_minutes} daqiqa
                      </p>
                    </div>
                    <span className="font-display text-base font-bold text-foreground">
                      {formatSom(parseFloat(s.price || "0") || 0)}
                    </span>
                  </li>
                ))}
              </ul>
            ))}

          {tab === "staff" &&
            (staff.length === 0 ? (
              <EmptyStateLuxury title="Barberlar yoʻq" />
            ) : (
              <ul className="space-y-2">
                {staff.map((b) => (
                  <li key={b.id}>
                    <Link
                      to="/booking/$salonId"
                      params={{ salonId: String(salon.id) }}
                      className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-soft outline-none transition hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <img
                        src={mediaSrc(b.avatar, "/placeholder.svg")}
                        alt=""
                        className="h-12 w-12 rounded-2xl object-cover ring-2 ring-gold/30"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-foreground">{b.full_name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          {b.role === "owner" ? "Owner" : "Barber"}
                          {b.experience_years ? ` · ${b.experience_years} yil tajriba` : ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background shadow-soft">
                        Tanlash
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ))}

          {tab === "reviews" &&
            (reviews.length === 0 ? (
              <EmptyStateLuxury title="Sharhlar yoʻq" body="Bron qilib, ilk sharh yozing." />
            ) : (
              <ul className="space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-2xl border border-border bg-surface p-3.5 shadow-soft">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{r.author_name || "Mehmon"}</h3>
                      <RatingStars value={r.rating} />
                    </div>
                    <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">{r.created_at}</p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/85">{r.text}</p>
                    {r.barber_reply && (
                      <div className="mt-3 rounded-xl border border-border/60 bg-muted/40 p-2.5 text-xs">
                        <p className="font-semibold text-foreground">Barber javobi</p>
                        <p className="mt-0.5 text-muted-foreground">{r.barber_reply}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ))}
        </div>
      </div>

      {/* Sticky Floating CTA */}
      <div
        className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3"
        style={{ bottom: "calc(5.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="pointer-events-auto w-full max-w-md">
          {loggedIn ? (
            <Link
              to="/booking/$salonId"
              params={{ salonId: String(salon.id) }}
              className="glass-pill flex h-13 w-full cursor-pointer items-center justify-between gap-3 rounded-full border border-border px-5 py-2.5 shadow-luxury outline-none transition active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {salon.name}
                </p>
                <p className="font-display text-base font-bold text-foreground">Band qilish</p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background shadow-soft">
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </span>
            </Link>
          ) : (
            <Link
              to="/auth"
              search={{ next: `/booking/${salon.id}` }}
              className="glass-pill flex h-13 w-full cursor-pointer items-center justify-between gap-3 rounded-full border border-border px-5 py-2.5 shadow-luxury outline-none transition active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Kirish kerak
                </p>
                <p className="font-display text-base font-bold text-foreground">Kirish va band qilish</p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background shadow-soft">
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
