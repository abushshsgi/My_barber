import type { Salon } from "@/types";
import { mediaSrc, PLACEHOLDER_SALON } from "./media";

export type SalonListApi = {
  id: number;
  name: string;
  slug: string;
  cover_image: string | null;
  latitude: string;
  longitude: string;
  address: string;
  premium: boolean;
  is_published?: boolean;
  rating_avg: number;
  review_count: number;
};

export function mapSalonListApi(r: SalonListApi): Salon {
  const cover = mediaSrc(r.cover_image, PLACEHOLDER_SALON);

  return {
    id: String(r.id),
    name: r.name,
    description: r.address || "Salon",
    coverImage: cover,
    gallery: [],
    rating: Number(r.rating_avg) || 0,
    reviewCount: r.review_count || 0,
    distance: 0,
    lat: parseFloat(r.latitude) || 0,
    lng: parseFloat(r.longitude) || 0,
    city: "",
    address: r.address || "",
    phone: "",
    languages: [],
    isPremium: r.premium,
    workingDays: [],
    workingHours: { open: "09:00", close: "21:00" },
    barbers: [],
    services: [],
    reviews: [],
  };
}
