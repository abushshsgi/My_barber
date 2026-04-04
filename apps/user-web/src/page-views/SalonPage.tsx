"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { StarRating } from "@/components/StarRating";
import { ArrowLeft, MapPin, Clock, Phone, Globe, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, getAccessToken } from "@/lib/api";
import { mediaSrc, PLACEHOLDER_SALON } from "@/lib/media";

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
};

export default function SalonPage() {
  const params = useParams();
  const id = params?.id as string;
  const [loggedIn, setLoggedIn] = useState(false);

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Yuklanmoqda...</p>
      </div>
    );
  }

  if (isError || !salon) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-3">
        <p className="text-muted-foreground text-center">
          {error instanceof Error ? error.message : "Salon topilmadi yoki yuklanmadi."}
        </p>
        <Link href="/" className="text-sm text-accent font-medium">
          Asosiy sahifaga
        </Link>
      </div>
    );
  }

  const sortedHours = [...(salon.hours || [])].sort((a, b) => a.weekday - b.weekday);
  const reviewAvgFromList =
    reviews.length > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
      : 0;
  const starsRating =
    typeof salon.rating_avg === "number" && salon.rating_avg > 0
      ? salon.rating_avg
      : reviewAvgFromList;

  return (
    <div className="min-h-screen pb-24">
      <div className="relative">
        <img
          src={mediaSrc(salon.cover_image, PLACEHOLDER_SALON)}
          alt={salon.name}
          className="w-full h-56 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        <Link
          href="/"
          className="absolute top-4 left-4 p-2 rounded-full bg-background/80 backdrop-blur-sm"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Link>
        {salon.premium && (
          <div className="absolute top-4 right-4 gold-gradient text-gold-foreground px-3 py-1 rounded-full flex items-center gap-1 text-xs font-semibold">
            <Crown className="h-3.5 w-3.5" /> Premium
          </div>
        )}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-bold text-foreground">{salon.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{salon.description}</p>
        </div>
      </div>

      <div className="px-4 -mt-2 space-y-4">
        <Card className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <StarRating rating={starsRating} size="md" showValue={starsRating > 0} />
            <span className="text-sm text-muted-foreground">
              {typeof salon.review_count === "number" ? salon.review_count : reviews.length}{" "}
              sharh
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" /> {salon.address || "Manzil ko‘rsatilmagan"}
          </div>
          {sortedHours.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Clock className="h-4 w-4 shrink-0" /> Ish vaqti
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5 pl-6">
                {sortedHours.map((h) => (
                  <li key={h.weekday}>
                    {WEEKDAY_UZ[h.weekday] ?? `Kun ${h.weekday}`}: {h.open_time} — {h.close_time}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {salon.phone ? (
            <a
              href={`tel:${salon.phone.replace(/\s/g, "")}`}
              className="flex items-center gap-2 text-sm text-accent font-medium"
            >
              <Phone className="h-4 w-4 shrink-0" /> {salon.phone}
            </a>
          ) : null}
          {(salon.languages || []).length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4 shrink-0" /> {(salon.languages || []).join(", ")}
            </div>
          )}
        </Card>

        {salon.images?.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Galereya</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {salon.images.map((img) => (
                <img
                  key={img.id}
                  src={mediaSrc(img.image, PLACEHOLDER_SALON)}
                  alt=""
                  className="w-32 h-24 object-cover rounded-lg shrink-0"
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-2">Xizmatlar</h2>
          <div className="space-y-2">
            {salon.services?.map((service) => (
              <Card key={service.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{service.name}</p>
                  <p className="text-xs text-muted-foreground">{service.duration_minutes} daqiqa</p>
                </div>
                <span className="font-semibold text-accent">
                  {parseFloat(service.price).toLocaleString()} so&apos;m
                </span>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Sharhlar</h2>
          <div className="space-y-2">
            {reviews.map((review) => (
              <Card key={review.id} className="p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{review.author_name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{review.created_at}</p>
                  </div>
                  <StarRating rating={review.rating} size="sm" showValue={false} />
                </div>
                <p className="text-sm text-muted-foreground">{review.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-20 left-4 right-4 z-40">
        <Link
          href={
            loggedIn
              ? `/booking/${salon.id}`
              : `/auth?next=${encodeURIComponent(`/booking/${salon.id}`)}`
          }
        >
          <Button className="w-full h-12 rounded-xl text-base font-semibold gold-gradient text-gold-foreground border-0 shadow-lg">
            {loggedIn ? "Band qilish" : "Kirish va band qilish"}
          </Button>
        </Link>
      </div>
    </div>
  );
}
