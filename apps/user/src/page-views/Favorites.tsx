"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Loader2, MapPin, Search, Trash2 } from "lucide-react";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
import { AuthGate } from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { formatKm } from "@/lib/format";
import { mediaSrc, PLACEHOLDER_SALON } from "@/lib/media";
import type { Salon } from "@/types";
import { fetchFavoriteSalonIds, setFavoriteSalon } from "../lib/favorites";

type SalonFavoriteDetail = {
  id: number;
  name: string;
  description?: string;
  cover_image: string | null;
  address?: string;
  phone?: string;
  premium?: boolean;
  rating_avg?: number;
  review_count?: number;
  latitude?: string | null;
  longitude?: string | null;
  services?: Array<{ id: number; name: string; price: string; duration_minutes: number }>;
};

function mapFavoriteDetail(row: SalonFavoriteDetail): Salon {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description || row.address || "Salon",
    coverImage: mediaSrc(row.cover_image, PLACEHOLDER_SALON),
    gallery: [],
    rating: Number(row.rating_avg || 0),
    reviewCount: Number(row.review_count || 0),
    distance: 0,
    lat: parseFloat(row.latitude || "0") || 0,
    lng: parseFloat(row.longitude || "0") || 0,
    city: "",
    address: row.address || "",
    phone: row.phone || "",
    languages: [],
    isPremium: !!row.premium,
    workingDays: [],
    workingHours: { open: "09:00", close: "21:00" },
    barbers: [],
    services: (row.services || []).map((service) => ({
      id: String(service.id),
      name: service.name,
      price: parseFloat(service.price || "0") || 0,
      duration: service.duration_minutes,
      salonId: String(row.id),
    })),
    reviews: [],
  };
}

async function fetchFavoriteSalons(): Promise<Salon[]> {
  const ids = await fetchFavoriteSalonIds();
  const rows = await Promise.all(
    ids.map(async (id) => {
      const res = await apiFetch(`/api/v1/salons/${id}/`);
      if (!res.ok) return null;
      return (await res.json()) as SalonFavoriteDetail;
    }),
  );
  return rows.filter((row): row is SalonFavoriteDetail => !!row).map(mapFavoriteDetail);
}

function Favorites() {
  const qc = useQueryClient();
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["favorites", "salons", "detail"],
    queryFn: fetchFavoriteSalons,
  });

  const removeFavorite = useMutation({
    mutationFn: (salonId: string) => setFavoriteSalon(salonId, false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites", "salons"] });
      qc.invalidateQueries({ queryKey: ["favorites", "salons", "count"] });
      qc.invalidateQueries({ queryKey: ["favorites", "salons", "detail"] });
    },
  });

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="px-5 pt-12">
        <p className="label-eyebrow">Saqlangan joylar</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Sevimlilar</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Yoqtirgan salonlaringiz server bilan sinxron saqlanadi.
            </p>
          </div>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-foreground text-background shadow-card">
            <Heart className="h-5 w-5 fill-current" />
          </span>
        </div>
      </header>

      <main className="px-5 pt-5">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-destructive/25 bg-destructive/5 p-5 text-center">
            <p className="text-sm font-semibold text-destructive">Sevimlilar yuklanmadi</p>
            <p className="mt-1 text-xs text-muted-foreground">{(error as Error).message}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface p-8 text-center shadow-soft">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-muted">
              <Search className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-foreground">Hali sevimli salon yo'q</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Salon sahifasidagi yurak belgisi orqali saqlang, keyin shu yerda tez topasiz.
            </p>
            <Link to="/map" className="mt-5 inline-flex">
              <Button className="h-11 rounded-2xl bg-primary px-5 text-primary-foreground">
                Salonlarni ko'rish
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.map((salon) => (
              <li key={salon.id} className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
                <Link to="/salon/$id" params={{ id: salon.id }} className="block">
                  <img
                    src={salon.coverImage}
                    alt={salon.name}
                    loading="lazy"
                    className="h-40 w-full object-cover"
                  />
                </Link>
                <div className="p-4">
                  <div className="flex gap-3">
                    <Link to="/salon/$id" params={{ id: salon.id }} className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-bold text-foreground">{salon.name}</h2>
                      <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {salon.address || "Manzil kiritilmagan"}
                        {salon.distance > 0 ? <span>· {formatKm(salon.distance)}</span> : null}
                      </p>
                    </Link>
                    <button
                      type="button"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border text-muted-foreground transition hover:border-destructive/40 hover:text-destructive"
                      onClick={() => removeFavorite.mutate(salon.id)}
                      disabled={removeFavorite.isPending}
                      aria-label="Sevimlidan olib tashlash"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <Link
                    to="/booking/$salonId"
                    params={{ salonId: salon.id }}
                    className="mt-4 grid h-11 place-items-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-soft"
                  >
                    Band qilish
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default function FavoritesWithAuth() {
  return (
    <AuthGate title="Sevimlilar uchun kiring" description="Saqlangan salonlaringizni ko'rish uchun mijoz akkaunti kerak.">
      <Favorites />
    </AuthGate>
  );
}
