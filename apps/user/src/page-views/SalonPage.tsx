"use client";

import { useParams } from "@/navigation";
import { useEffect, useState } from "react";
import { Link } from "@/navigation";
import { useRouter } from "@/navigation";
import { ArrowLeft, Clock, Globe, Heart, MapPin, Phone, Share2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, getAccessToken } from "@/lib/api";
import { mediaSrc, PLACEHOLDER_SALON } from "@/lib/media";
import { RatingStars } from "@/components/luxury/RatingStars";
import { EmptyStateLuxury, LoadingSkeleton } from "@/components/luxury/States";
import { formatSom } from "@/lib/format";

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

export default function SalonPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState<"about" | "services" | "staff" | "reviews">("about");

  useEffect(() => {
    setLoggedIn(!!getAccessToken());
  }, []);

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
        <LoadingSkeleton className="h-64 w-full rounded-3xl" />
        <LoadingSkeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError || !salon) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
        <EmptyStateLuxury title="Salon yo‘q" body={error instanceof Error ? error.message : "Ma’lumot yuklanmadi."} />
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

  const hoursLine =
    sortedHours.length > 0
      ? sortedHours.map((h) => `${WEEKDAY_UZ[h.weekday]?.slice(0, 3) ?? h.weekday}: ${h.open_time}–${h.close_time}`).join(" · ")
      : "";

  return (
    <div className="mx-auto w-full max-w-md bg-background pb-32">
      <div className="relative">
        <img
          src={mediaSrc(salon.cover_image, PLACEHOLDER_SALON)}
          alt={salon.name}
          className="h-72 w-full object-cover"
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-safe">
          <button
            type="button"
            onClick={() =>
              typeof window !== "undefined" && window.history.length > 1
                ? window.history.back()
                : router.push("/")
            }
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-surface/90 shadow-soft backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Ulashish"
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-surface/90 shadow-soft backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() =>
                navigator.share?.({ title: salon.name, url: window.location.href }).catch(() => null)
              }
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Saqlash"
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-surface/90 shadow-soft backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Heart className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="-mt-10 rounded-t-3xl bg-background px-5 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{salon.name}</h1>
          {salon.premium ? (
            <span className="rounded-full bg-foreground px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-background">
              Premium
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <RatingStars value={starsRating || 0} count={reviewCountShown} size="md" />
          <span className="text-muted-foreground">·</span>
          <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{salon.address}</span>
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {hoursLine ? (
            <>
              <span className="font-semibold text-success">Ish jadvali</span>
              {" · "}
              {hoursLine}
            </>
          ) : (
            <>
              <span className="text-muted-foreground">Ish jadvali kiritilmagan</span>
            </>
          )}
        </p>

        <div className="mt-5 -mx-5 flex gap-1 overflow-x-auto border-b border-border px-5 scrollbar-none">
          {([
            { id: "about" as const, label: "Ma'lumot" },
            { id: "services" as const, label: "Xizmatlar" },
            { id: "staff" as const, label: "Staff" },
            { id: "reviews" as const, label: "Sharhlar" },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                "shrink-0 cursor-pointer px-4 py-3 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
                tab === t.id ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === "about" && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-foreground/80">
                {salon.description?.trim() || "Salon haqida matn mavjud emas."}
              </p>
              {salon.phone ? (
                <a
                  href={`tel:${salon.phone.replace(/\s/g, "")}`}
                  className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground underline-offset-2 hover:underline"
                >
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {salon.phone}
                </a>
              ) : null}
              {(salon.languages || []).length > 0 ? (
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Globe className="mt-0.5 h-4 w-4 shrink-0" />
                  {(salon.languages || []).join(", ")}
                </p>
              ) : null}
              {sortedHours.length > 0 ? (
                <ul className="space-y-1 rounded-2xl border border-border bg-surface p-3 text-xs text-muted-foreground shadow-soft">
                  {sortedHours.map((h) => (
                    <li key={h.weekday} className="flex gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-foreground/90">
                        {WEEKDAY_UZ[h.weekday] ?? `Kun ${h.weekday}`}: {h.open_time} — {h.close_time}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {(salon.images ?? []).length > 0 ? (
                <div>
                  <p className="label-eyebrow mb-2 px-1">Galereya</p>
                  <div className="grid grid-cols-3 gap-2">
                    {salon.images?.slice(0, 9).map((img) => (
                      <img
                        key={img.id}
                        src={mediaSrc(img.image, PLACEHOLDER_SALON)}
                        alt=""
                        loading="lazy"
                        className="aspect-square w-full rounded-xl object-cover"
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {portfolio.length > 0 ? (
                <div>
                  <p className="label-eyebrow mb-2 px-1">Ish natijalari</p>
                  <div className="grid grid-cols-3 gap-2">
                    {portfolio.slice(0, 9).map((item) => (
                      <img
                        key={item.booking_id}
                        src={mediaSrc(item.image, PLACEHOLDER_SALON)}
                        alt=""
                        loading="lazy"
                        className="aspect-square w-full rounded-xl object-cover"
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {tab === "services" &&
            ((salon.services?.length ?? 0) === 0 ? (
              <EmptyStateLuxury title="Xizmatlar yo‘q" body="Administrator xizmatlarni qoʻshishi kerak." />
            ) : (
              <ul className="space-y-2">
                {salon.services?.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3 shadow-soft"
                  >
                    <div>
                      <h3 className="text-sm font-semibold">{s.name}</h3>
                      <p className="text-xs text-muted-foreground">{s.duration_minutes} daqiqa</p>
                    </div>
                    <span className="text-sm font-bold">{formatSom(parseFloat(s.price || "0") || 0)}</span>
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
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold">{b.full_name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          {b.role === "owner" ? "Owner" : "Barber"}
                          {b.experience_years ? ` · ${b.experience_years} yil` : ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-soft">
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
                  <li key={r.id} className="rounded-2xl border border-border bg-surface p-3 shadow-soft">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">{r.author_name || "Mehmon"}</h3>
                      <RatingStars value={r.rating} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{r.created_at}</p>
                    <p className="mt-2 text-sm text-foreground/80">{r.text}</p>
                    {r.barber_reply ? (
                      <div className="mt-3 rounded-xl border border-border/60 bg-background/50 p-2.5 text-xs">
                        <p className="font-semibold text-foreground">Barber javobi</p>
                        <p className="mt-0.5 text-muted-foreground">{r.barber_reply}</p>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-border bg-surface/95 pb-safe pt-3 backdrop-blur">
        <div className="px-5">
          {loggedIn ? (
            <Link
              to="/booking/$salonId"
              params={{ salonId: String(salon.id) }}
              className="grid h-12 w-full cursor-pointer place-items-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-luxury focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Band qilish
            </Link>
          ) : (
            <Link
              to="/auth"
              search={{ next: `/booking/${salon.id}` }}
              className="grid h-12 w-full cursor-pointer place-items-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-luxury focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Kirish va band qilish
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
